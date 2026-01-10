#ifndef SOUNDCARD_H
#define SOUNDCARD_H

#include <portaudio.h>
#include "AudioTypes.h"
#include "LevelInfo.h"
#include <atomic>
#include <memory>
#include <vector>
#include <algorithm>
#include <cstdint>

struct ChanMeterAccum
{
    double sumSquares = 0.0;
    float peakAbs = 0.0f;
    uint32_t frames = 0;
};

class Soundcard
{
    PaStream *stream_;
    int numInputChannels_ = 0;
    int numOutputChannels_ = 0;
    int deviceId_ = 0;
    std::atomic<bool> isAlive_{false};

    // The audio tick callback signature:
    // - out: interleaved output buffer (float), size = frames * outCh
    // - in:  interleaved input buffer  (float or null), size = frames * inCh
    // - frames: number of frames this tick
    // - user: the context pointer provided at registration (pointer to user data that was passed in WHEN the user registered the callback)
    //(*) means it's a pointer
    // using AudioFn = void (*)(float *out, const float *in, unsigned long frames, void *user);
    // Internal storage for callbacks
    struct CbEntry
    {
        uint64_t id;
        int priority;
        AudioFn fn;
    };

    // Atomically-swapped table the RT thread reads
    // More complex than it looks. It's a std::atomic object holding a shared pointer pointing at a vector of CbEntries.
    // std::atomic is the atomic object, which takes in a shared_ptr. That shared_ptr takes in a std::vector of CbEntries.
    // Our variable is called cbTable, and since it's an atomic object, we have to pass in what we want into it
    // Hence we pass into the atomic constructor (those {} braces) a shared pointer of type vector of callback entries
    // std::atomic<std::shared_ptr<const std::vector<CbEntry>>> cbTable_{std::make_shared<const std::vector<CbEntry>>()};
    // This version however is the pre C++20 version. Ie not making it atomic here but rather doing the atomic load and store elsewhere:
    std::shared_ptr<const std::vector<CbEntry>> cbTable_ = std::make_shared<const std::vector<CbEntry>>();
    // Just making an atomic integer for the next callback ID, starting at 1
    std::atomic<uint64_t> nextCbId_{1};

    // void init();
    static int paCallback(const void *input, void *output,
                          unsigned long frames,
                          const PaStreamCallbackTimeInfo *timeInfo,
                          PaStreamCallbackFlags status,
                          void *userData);

    // METERING:
    std::vector<ChanMeterAccum> inAccum_;          // callback thread only. Sum squares, peak, frames
    std::vector<std::atomic<float>> inLastRmsDb_;  // published (per channel)
    std::vector<std::atomic<float>> inLastPeakDb_; // published (per channel)
    uint32_t windowFrames_ = 4800;                 // ~100ms worth of audio
    bool inputMetersEnabled_ = false;

    static inline float db20_from_linear(float x) noexcept
    {
        constexpr float floorDb = -120.0f;
        const float eps = 1e-6f; // 20*log10(1e-6) = -120 dB
        float db = 20.0f * std::log10f(x + eps);
        return db < floorDb ? floorDb : db;
    }

    // Gets called from within openAndStartStream
    void enableInputMeters();

    void accumulateInputMeters(const float *in, unsigned long frames) noexcept;
    void maybePublishInputMeters() noexcept;

public:
    Soundcard(int numInputChannels, int numOutputChannels, int deviceId);
    // Temp:
    // double left_phase_;
    // double right_phase_;
    // End Temp

    void openAndStartStream();

    // Register a callback with a priority (higher first). Returns a handle (id).
    CallbackHandle registerAudioCallback(int priority, AudioFn fn);

    // Unregister by handle. Returns true if removed.
    bool unregisterAudioCallback(CallbackHandle h);

    bool checkIfAlive();

    void stopStream();
    void closeStream();

    // METERING:

    // JS poller reads these:
    // struct LevelInfo
    // {
    //     float rmsDb;
    //     float peakDb;
    // };
    std::vector<LevelInfo> getInputLevelInfos() const;
};

#endif