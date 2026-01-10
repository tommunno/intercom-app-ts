#ifndef INPUT_H
#define INPUT_H

#include "RingBuffer.hpp"
#include "InputGate.hpp"
#include "AudioTypes.h"
#include "LevelInfo.h"

#include <cstddef> // size_t
#include <cstdint> // uint32_t
#include <atomic>  // std::atomic
#include <vector>  // std::vector
#include <cmath>   // std::pow (for setGain), maybe std::fabs
#include <limits>  // std::numeric_limits<float>::infinity()

class Engine; // <-- forward declare (no include of Engine.h here)

class BufferedInput
{
    Engine &engine_;
    std::size_t id_;
    bool isRouted_{false};
    std::vector<float> outputAudio_; // scratch for current callback only
    InputGate inputGate_;
    CallbackHandle audioCallbackHandle_;
    std::atomic<float> gainFactor_{1.0f};

    struct MeterAccum
    {
        double sumSquares = 0.0; // sum of x*x since last publish
        float peakAbs = 0.0f;
        size_t frames = 0; // samples counted since last publish
    };

    MeterAccum meter_;
    std::atomic<float> lastRmsDb_{-120.0f};  // published at block boundary
    std::atomic<float> lastPeakDb_{-120.0f}; // published at block boundary

    // Config for the metering window:
    size_t windowFrames_ = 4800; // 100ms at 48kHz

public:
    BufferedInput(Engine &engine, int id);
    std::vector<float> tempBuffer; // temporary buffer for audio processing
    SpscRingBuffer<float> ringBuffer;

    void start();
    bool isRouted() const;
    bool setRouted(bool routed);
    void route(const std::vector<float> &chunk);

    // void processAudio(float *out, float *in, unsigned long frames);
    const float *getAudio();

    void setGain(int gain);
    void processGain(std::size_t numSamples);

    void accumulateMetersFromBlock(const float *data, size_t frames) noexcept;
    void maybePublishMeters() noexcept;

    // Public getters for main thread / JS:
    float getRmsDb() const noexcept { return lastRmsDb_.load(std::memory_order_acquire); }
    float getPeakDb() const noexcept { return lastPeakDb_.load(std::memory_order_acquire); }
    LevelInfo getLevelInfo() const noexcept { return LevelInfo{getRmsDb(), getPeakDb()}; }
};

#endif