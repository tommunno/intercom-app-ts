#pragma once
#include "./Logger.h"
#include <atomic>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <memory>
#include <type_traits>
#include <algorithm>

/// Lock-free SPSC (Single-Producer / Single-Consumer) ring buffer.
/// - T must be trivially copyable (audio samples, POD structs).
/// - Capacity is rounded up to next power of two.
/// - Real-time friendly: no locks, no allocations after ctor.
/// Memory ordering:
///   - Producer uses head_.load(acquire) + tail_.store(release)
///   - Consumer uses tail_.load(acquire) + head_.store(release)
template <typename T>
class SpscRingBuffer
{
    static_assert(std::is_trivially_copyable<T>::value,
                  "SpscRingBuffer<T>: T must be trivially copyable.");

public:
    std::size_t inputId;
    explicit SpscRingBuffer(std::size_t inpId, std::size_t capacity) : inputId(inpId)
    {
        if (capacity < 2)
            capacity = 2;
        capacity_ = roundUpToPow2(capacity);
        mask_ = capacity_ - 1;
        data_.reset(new T[capacity_]); // single allocation, no further mallocs
        // No other threads  can access these yet, hence fine to use relaxed:
        // We already initialise them at the bottom, so not sure this is needed?
        head_.store(0, std::memory_order_relaxed);
        tail_.store(0, std::memory_order_relaxed);
    }

    // -------- High-level convenience API --------

    // Push 1 element. Returns false if full.
    // bool push(const T &v) noexcept
    // {
    //     return write(&v, 1) == 1;
    // }

    // Pushes 1 element and overwrites if necessary.
    bool push(const T &v) noexcept
    {
        write_overwrite(&v, 1);
        return true;
    }

    // Pop 1 element. Returns false if empty.
    bool pop(T &out) noexcept
    {
        return read(&out, 1) == 1;
    }

    bool empty() const noexcept
    {
        size_t h = head_.load(std::memory_order_acquire);
        size_t t = tail_.load(std::memory_order_acquire);
        return t == h;
    }

    bool full() const noexcept
    {
        size_t h = head_.load(std::memory_order_acquire);
        size_t t = tail_.load(std::memory_order_acquire);
        return (t - h) == capacity_;
    }

    size_t size() const noexcept
    {
        size_t h = head_.load(std::memory_order_acquire);
        size_t t = tail_.load(std::memory_order_acquire);
        return t - h; // 0..capacity_
    }

    size_t free_space() const noexcept
    {
        return capacity_ - size(); // 0..capacity_
    }

    // Write up to `count` elements. Returns # actually written.
    // Producer-thread only.
    size_t write(const T *src, size_t count) noexcept
    {
        size_t h = head_.load(std::memory_order_acquire);
        size_t t = tail_.load(std::memory_order_relaxed);

        const size_t free = capacity_ - (t - h);
        if (free == 0)
            return 0;

        size_t n = (count < free) ? count : free;

        // First contiguous chunk before wrap.
        size_t tailIndex = t & mask_;
        size_t first = std::min(n, capacity_ - tailIndex);

        std::memcpy(&data_[tailIndex], src, first * sizeof(T));

        // Second chunk from start, if needed.
        size_t second = n - first;
        if (second)
        {
            std::memcpy(&data_[0], src + first, second * sizeof(T));
        }

        // Publish new tail.
        tail_.store(t + n, std::memory_order_release);
        return n;
    }

    // Read up to `count` elements. Returns # actually read.
    // Consumer-thread only.
    size_t read(T *dst, size_t count) noexcept
    {
        size_t t = tail_.load(std::memory_order_acquire);
        size_t h = head_.load(std::memory_order_relaxed);

        const size_t avail = t - h;
        if (avail == 0)
            return 0;

        size_t n = (count < avail) ? count : avail;

        size_t headIndex = h & mask_;
        size_t first = std::min(n, capacity_ - headIndex);

        std::memcpy(dst, &data_[headIndex], first * sizeof(T));

        size_t second = n - first;
        if (second)
        {
            std::memcpy(dst + first, &data_[0], second * sizeof(T));
        }

        // Publish new head.
        head_.store(h + n, std::memory_order_release);
        return n;
    }

    // Read exactly `count` elements; if not enough available, zero-fill the rest.
    // Handy for audio output: prevents clicks when upstream starves.
    size_t read_or_silence(T *dst, size_t count, const T &zero = T{}) noexcept
    {
        size_t got = read(dst, count);
        for (size_t i = got; i < count; ++i)
            dst[i] = zero;
        return got;
    }

    // Overwrite mode: ensure `count` items will be written,
    // dropping the oldest unread data if necessary.
    // Returns # written (always == count).
    size_t write_overwrite(const T *src, size_t count) noexcept
    {

        if (count == 0)
            return 0;
        if (count > capacity_)
        {
            // Keep only the newest full buffer worth.
            src += (count - capacity_);
            count = capacity_;
        }

        size_t h = head_.load(std::memory_order_acquire);
        size_t t = tail_.load(std::memory_order_relaxed);

        const size_t used = t - h;
        const size_t free = capacity_ - used;
        if (count > free)
        {
            // Drop oldest by advancing head.
            head_.store(h + (count - free), std::memory_order_release);
        }

        // Now we have space for `count`.
        return write(src, count);
    }

private:
    static size_t roundUpToPow2(size_t x) noexcept
    {
        // Rounds to next power of two (min 2).
        x--;
        x |= x >> 1;
        x |= x >> 2;
        x |= x >> 4;
        x |= x >> 8;
        x |= x >> 16;
#if SIZE_MAX > 0xFFFFFFFFu
        x |= x >> 32;
#endif
        x++;
        return x;
    }

    // Padding head/tail onto separate cache lines reduces false sharing.
    alignas(64) std::atomic<size_t> head_{0};
    alignas(64) std::atomic<size_t> tail_{0};
    alignas(64) std::unique_ptr<T[]> data_;
    size_t capacity_{0};
    size_t mask_{0};
};

// HOW TO CALL:
// SpscRingBuffer<int16_t> outRB(4096); // samples, not frames

// // Main/JS thread:
// void enqueueToOutput(const int16_t *samples, size_t n)
// {
//     // If you prefer not to drop, check free_space() first.
//     outRB.write_overwrite(samples, n);
// }

// // PortAudio callback (consumer):
// unsigned long paCallback(const void *in, void *out,
//                          unsigned long frames,
//                          const PaStreamCallbackTimeInfo *,
//                          PaStreamCallbackFlags,
//                          void *userData)
// {
//     auto *out16 = static_cast<int16_t *>(out);
//     const size_t need = frames * kChannels;
//     outRB.read_or_silence(out16, need, /*zero*/ 0);
//     return paContinue;
// }

// SpscRingBuffer<int16_t> inRB(4096);

// // PortAudio callback (producer):
// unsigned long paCallback(const void *in, void *out,
//                          unsigned long frames,
//                          const PaStreamCallbackTimeInfo *,
//                          PaStreamCallbackFlags,
//                          void *userData)
// {
//     (void)out; // not used
//     auto *in16 = static_cast<const int16_t *>(in);
//     const size_t got = frames * kChannels;
//     // Never blocks the callback. If full, drops oldest to preserve recency.
//     inRB.write_overwrite(in16, got);
//     return paContinue;
// }

// // JS/main thread (e.g., on TSFN fire):
// void drainInputToJs(std::vector<int16_t> &tmp)
// {
//     tmp.resize(2048);
//     while (true)
//     {
//         size_t n = inRB.read(tmp.data(), tmp.size());
//         if (!n)
//             break;
//         // send n samples to JS, or accumulate, etc.
//     }
// }

// // Producer side:
// if (auto span = outRB.get_write_span(); span.len)
// {
//     // Fill up to span.len samples without copying twice:
//     fill_from_mixer(span.ptr, span.len);
//     outRB.commit_write(span.len);
// }

// // Consumer side:
// if (auto span = outRB.get_read_span(); span.len)
// {
//     // Write span.len samples straight to the device/output buffer:
//     std::memcpy(outToDevice, span.ptr, span.len * sizeof(int16_t));
//     outRB.commit_read(span.len);
// }
