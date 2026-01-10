#include "./include/Soundcard.h"
#include "./include/AudioTypes.h"
#include "./include/PortAudioGlobal.hpp"
#include "./include/Logger.h"
#include <portaudio.h>
#include <stdexcept>
#include <string>
#include <iostream>
#include <atomic>
#include <memory>
#include <vector>
#include <algorithm>
#include <cstdint>

Soundcard::Soundcard(int numInputChannels, int numOutputChannels, int deviceId) : numInputChannels_(numInputChannels), numOutputChannels_(numOutputChannels), deviceId_(deviceId) {}

int Soundcard::paCallback(const void *input, void *output,
                          unsigned long frames,
                          const PaStreamCallbackTimeInfo *timeInfo,
                          PaStreamCallbackFlags status,
                          void *userData)
{

    // Cast userData back to a pointer to Soundcard (ie, getting access to this)
    auto *self = static_cast<Soundcard *>(userData);

    float *out = static_cast<float *>(output);
    const float *in = static_cast<const float *>(input);

    // Start with silence so callbacks can "add" (mix) in place
    if (out)
        std::fill(out, out + frames * self->numOutputChannels_, 0.0f);

    // Snapshot the current callback table
    auto table = std::atomic_load(&self->cbTable_); // seq_cst load.

    // Call in priority order
    // Contract: each callback may add into 'out' (accumulate), reading 'in' as needed
    for (const auto &e : *table)
    {
        e.fn(out, in, frames);
    }

    self->isAlive_.store(true, std::memory_order_relaxed); // Mark as alive

    return paContinue;
}

void Soundcard::openAndStartStream()
{

    double srate = 48000;
    PaStreamParameters outputParameters;
    PaStreamParameters inputParameters;
    bzero(&inputParameters, sizeof(inputParameters));
    inputParameters.channelCount = numInputChannels_;
    inputParameters.device = deviceId_;
    inputParameters.sampleFormat = paFloat32;
    bzero(&outputParameters, sizeof(outputParameters));
    outputParameters.channelCount = numOutputChannels_;
    outputParameters.device = deviceId_;
    outputParameters.sampleFormat = paFloat32;

    PaError err;

    unsigned long framesPerBuffer = 480; // could be paFramesPerBufferUnspecified, in which case PortAudio will do its best to manage it for you, but, on some platforms, the framesPerBuffer will change in each call to the callback

    err = Pa_OpenStream(
        &stream_,
        &inputParameters,
        &outputParameters,
        srate,
        framesPerBuffer,
        paNoFlag, // flags that can be used to define dither, clip settings and more
        // Our callback function. A function name like this DECAYS to a pointer, similar to how an array decays to a pointer
        // Makes sense because a function is just a pointer to its code
        paCallback,
        // When passing in a pointer to a callback function like the line above, one can't access the this keyword from within it
        // Hence instead we pass in this here, and portaudio passes it through to us when it calls the callback
        //(A different more modern design choice would be to use new std::function and bind similar to JS .bind(this), or one could pass in this using a lambda function as well. But these won't work with the C-style function pointer signature required by PortAudio)
        //(PS a lambda function can be passed in when expecting a pointer, but only if it's stateless)
        //(And a lambda function can't be a method on a class)
        (void *)this); // data to be passed to callback. In C++, it is frequently (void *)this

    if (err != paNoError)
        throw std::runtime_error("PortAudio error: " + std::string(Pa_GetErrorText(err)));
    Logger::LOG("Successfully opened PortAudio stream", Logger::Types::INFO);

    err = Pa_StartStream(stream_);
    if (err != paNoError)
        throw std::runtime_error("PortAudio error: " + std::string(Pa_GetErrorText(err)));
    Logger::LOG("Successfully started PortAudio stream", Logger::Types::INFO);

    enableInputMeters();
}

// PUBLIC:

CallbackHandle Soundcard::registerAudioCallback(int priority, AudioFn fn)
{
    // If fn is a null pointer, then return the default CallbackHandle object, which has an id of 0
    if (!fn)
    {
        Logger::LOG("Cannot register a null callback function in registerAudioCallback", Logger::Types::WARNING);
        return {};
    }
    // Copy current table
    // Loads the cbTable for us to be able to do things to it
    // This gives us a shared pointer to the current callback table. Editing this would not be atomic.
    // auto cur = cbTable_.load();
    auto cur = std::atomic_load(&cbTable_); // seq_cst load.
    // Make a shared pointer based upon our load of the cbTable
    // make_shared always copies the data to the heap. So by dereferencing cur with *cur, we're creating a new vector on the heap based on copied data from cur
    auto next = std::make_shared<std::vector<CbEntry>>(*cur);
    // Append new entry
    // fetch_add is an atomic way of adding to that atomic int, so it adds 1, BUT returns its current value (ie pre the add)
    // nextCbId is initialized to 1 in the header file, which means the first callback will have an ID of 1
    CbEntry e{nextCbId_.fetch_add(1), priority, fn};
    next->push_back(e);
    // Sort high priority first, stable by id
    std::stable_sort(next->begin(), next->end(),
                     [](const CbEntry &a, const CbEntry &b)
                     {
                         if (a.priority != b.priority)
                             return a.priority < b.priority; // smaller first
                         return a.id < b.id;                 // deterministic tie-break
                     });
    // Publish
    // We're downcasting from a shared pointer of our vector to a CONST shared pointer of our vector, which is what our cbTable_ expects
    // cbTable_.store(std::shared_ptr<const std::vector<CbEntry>>(next));
    std::atomic_store(&cbTable_, std::shared_ptr<const std::vector<CbEntry>>(next));
    Logger::LOG("Registered callback with id " + std::to_string(e.id) + " and priority " + std::to_string(e.priority), Logger::Types::INFO, false);
    return {e.id};
}

bool Soundcard::unregisterAudioCallback(CallbackHandle h)
{
    // If there is an id of eg 0, then we just return. This would happen in the case of someone trying to register a callback but passing in a null pointer instead of a pointer to the function (see register callback method)
    if (!h.id)
    {
        Logger::LOG("Invalid id of " + std::to_string(h.id) + " in unregisterAudioCallback", Logger::Types::WARNING);
        return false;
    }
    // auto cur = cbTable_.load();
    auto cur = std::atomic_load(&cbTable_); // seq_cst load.
    auto next = std::make_shared<std::vector<CbEntry>>();
    // Note for we're pushing things into the 'next' vector in the for loop below
    // Each push can mean memory reallocations behind the scenes
    // More efficient way is to allocate enough memory all in once up front, with .reserve:
    next->reserve(cur->size());

    bool removed = false;
    for (const auto &e : *cur)
    {
        if (e.id == h.id)
        {
            removed = true;
            continue;
        }
        next->push_back(e);
    }
    if (!removed)
        return false;
    std::atomic_store(&cbTable_, std::shared_ptr<const std::vector<CbEntry>>(next));
    return true;
}

bool Soundcard::checkIfAlive()
{
    bool result = isAlive_.exchange(false, std::memory_order_relaxed); // Read and clear the flag
    return result;
}

void Soundcard::stopStream()
{
    if (!stream_)
        throw std::runtime_error("[Soundcard]: PortAudio stream does not exist, so cannot stop the stream");

    PaError err;
    err = Pa_StopStream(stream_);
    if (err != paNoError)
        throw std::runtime_error("PortAudio error: " + std::string(Pa_GetErrorText(err)));
    Logger::LOG("Successfully stopped PortAudio stream", Logger::Types::INFO);
    isAlive_.store(false, std::memory_order_relaxed); // Mark as not alive
}

void Soundcard::closeStream()
{
    if (!stream_)
        throw std::runtime_error("[Soundcard]: PortAudio stream does not exist, so cannot close the stream");
    Pa_CloseStream(stream_); // ignore error on teardown
    stream_ = nullptr;
    isAlive_.store(false, std::memory_order_relaxed); // Mark as not alive
}

// METERING:

void Soundcard::enableInputMeters()
{
    const uint32_t ch = static_cast<uint32_t>(numInputChannels_);
    if (ch == 0)
        return;

    // Assign means destroy whatever was in inAccum_ before, make its size exactly ch,
    // And fill every element with a value-initialized ChanMeterAccum{}
    inAccum_.assign(ch, ChanMeterAccum{});
    // inLastRmsDb_.assign(ch, std::atomic<float>{-120.0f});
    // inLastPeakDb_.assign(ch, std::atomic<float>{-120.0f});
    // Build atomics in-place with sufficient capacity to avoid any move
    // Build new vectors of atomics from scratch
    std::vector<std::atomic<float>> newRms(ch);
    std::vector<std::atomic<float>> newPeak(ch);
    for (uint32_t i = 0; i < ch; ++i)
    {
        newRms[i].store(-120.0f, std::memory_order_relaxed);
        newPeak[i].store(-120.0f, std::memory_order_relaxed);
    }

    // Move the containers into the members (pointer swap; no element moves)
    inLastRmsDb_ = std::move(newRms);
    inLastPeakDb_ = std::move(newPeak);

    // Register a low-priority callback that only reads 'in'
    registerAudioCallback(/*priority=*/90, [this](float *out, const float *in, unsigned long frames)
                          {
        if (inputMetersEnabled_ && in && numInputChannels_ > 0 && frames > 0) {
            accumulateInputMeters(in, frames);
            maybePublishInputMeters();
        }
        (void)out; });

    inputMetersEnabled_ = true;
}

// Interleaved float32 input, per-channel accumulation
void Soundcard::accumulateInputMeters(const float *in, unsigned long frames) noexcept
{
    const uint32_t ch = static_cast<uint32_t>(numInputChannels_);
    // For each channel, walk its lane: in[c + i*ch]
    for (uint32_t c = 0; c < ch; ++c)
    {
        double sumSq = inAccum_[c].sumSquares;
        float peak = inAccum_[c].peakAbs;
        uint32_t f = inAccum_[c].frames;

        const float *p = in + c;
        for (unsigned long i = 0; i < frames; ++i, p += ch)
        {
            const float s = *p;
            sumSq += double(s) * double(s);
            const float a = std::fabs(s);
            if (a > peak)
                peak = a;
        }

        inAccum_[c].sumSquares = sumSq;
        inAccum_[c].peakAbs = peak;
        inAccum_[c].frames = f + frames;
    }
}

void Soundcard::maybePublishInputMeters() noexcept
{
    if (windowFrames_ == 0)
        return;
    const uint32_t ch = static_cast<uint32_t>(numInputChannels_);

    // Only publish when all channels have >= windowFrames_
    if (ch == 0)
        return;
    for (uint32_t c = 0; c < ch; ++c)
    {
        if (inAccum_[c].frames < windowFrames_)
            return;
    }

    // Publish per channel, then reset accumulators
    for (uint32_t c = 0; c < ch; ++c)
    {
        const double meanSq = inAccum_[c].sumSquares / double(inAccum_[c].frames);
        const float rmsLin = std::sqrt(static_cast<float>(meanSq));
        const float rmsDb = db20_from_linear(rmsLin);
        const float peakDb = db20_from_linear(inAccum_[c].peakAbs);

        inLastRmsDb_[c].store(rmsDb, std::memory_order_release);
        inLastPeakDb_[c].store(peakDb, std::memory_order_release);

        inAccum_[c].sumSquares = 0.0;
        inAccum_[c].peakAbs = 0.0f;
        inAccum_[c].frames = 0;
    }
}

std::vector<LevelInfo> Soundcard::getInputLevelInfos() const
{
    const uint32_t ch = static_cast<uint32_t>(numInputChannels_);
    std::vector<LevelInfo> out;
    out.reserve(ch);
    for (uint32_t c = 0; c < ch; ++c)
    {
        // simple pair of loads; if you want a "consistent pair" add a seq as shown earlier
        const float rms = inLastRmsDb_[c].load(std::memory_order_acquire);
        const float peak = inLastPeakDb_[c].load(std::memory_order_acquire);
        out.push_back(LevelInfo{rms, peak});
    }
    return out;
}