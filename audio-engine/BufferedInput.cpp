#include <iostream>
#include "./include/BufferedInput.h"
#include "./include/RingBuffer.hpp"
#include "./include/AudioTypes.h"
#include "./include/Engine.h"
#include "./include/Logger.h"
#include <algorithm>
#include <cassert>
#include <cmath>
#include <stdexcept>
#include <string>
#include <cstdint>
#include <iostream>

BufferedInput::BufferedInput(Engine &engine, int id) : engine_(engine), id_(id), inputGate_(id_, ringBuffer, 480 * 2, 480), ringBuffer(id_, 4096)
{
    outputAudio_.resize(480 * 2, 0.0f);
    Logger::LOG("BufferedInput created with ID: " + std::to_string(id_), Logger::Types::INFO, false);
    // start();
}

void BufferedInput::start()
{
    audioCallbackHandle_ = engine_.soundcard.registerAudioCallback(
        /*priority=*/100,
        /*fn=*/
        [this](float *out, const float *in, unsigned long frames)
        {
            assert(this->outputAudio_.size() >= frames && "outputAudio_.size() < frames in BufferedInput::processAudio");

            this->inputGate_.process(this->outputAudio_.data(), frames);

            this->processGain(frames);

            // Update meter accumulators from this block
            this->accumulateMetersFromBlock(this->outputAudio_.data(), frames);

            // If we’ve reached about the window size, publish block RMS/peak (no decay) and reset
            this->maybePublishMeters();

            (void)out;
            (void)in;
        });
}

bool BufferedInput::isRouted() const
{
    return isRouted_;
}

bool BufferedInput::setRouted(bool routed)
{
    isRouted_ = routed;
    return isRouted_;
}

void BufferedInput::route(const std::vector<float> &chunk)
{
    if (!isRouted_)
        throw std::runtime_error("BufferedInput not routed for id " + std::to_string(id_));
    ringBuffer.write_overwrite(chunk.data(), chunk.size());
}

const float *BufferedInput::getAudio()
{
    return outputAudio_.data();
}

void BufferedInput::setGain(int gain)
{
    gainFactor_.store(std::pow(10.0f, static_cast<float>(gain) / 20.0f), std::memory_order_relaxed); // Convert dB to linear scale
}

void BufferedInput::processGain(std::size_t numSamples)
{
    const float gainFactor = gainFactor_.load(std::memory_order_relaxed);
    // If gainFactor is effectively 1.0f (within a small epsilon), skip processing
    // fabsf gets the absolute value of a float (returning it as a float) (ie, -3 is 3, 5 is 5)
    // So we're getting the absolute DIFFERENCE between gainFactor and 1.0f
    // And if that difference is less than 0.00000001 (1e-8, 1 x 10 to the -8), we skip processing
    if (fabsf(gainFactor - 1.0f) < 1e-6f)
        return;

    for (std::size_t i = 0; i < numSamples; ++i)
    {
        outputAudio_[i] *= gainFactor;
    }
}

// METER LOGIC:

static inline float db20_from_linear(float x) noexcept
{
    constexpr float floorDb = -120.0f;
    const float eps = 1e-6f; // 20*log10(1e-6) = -120 dB
    float db = 20.0f * std::log10f(x + eps);
    return db < floorDb ? floorDb : db;
}

void BufferedInput::accumulateMetersFromBlock(const float *data, size_t frames) noexcept
{
    double sumSquares = 0.0;
    float peak = meter_.peakAbs;

    for (size_t i = 0; i < frames; ++i)
    {
        const float sample = data[i];
        sumSquares += double(sample) * double(sample);
        const float absSample = std::fabs(sample);
        if (absSample > peak)
            peak = absSample;
    }

    meter_.sumSquares += sumSquares;
    meter_.peakAbs = peak;
    meter_.frames += frames;
}

void BufferedInput::maybePublishMeters() noexcept
{
    // Publish whenever we’ve accumulated >= 100 ms worth of *samples*.
    if (meter_.frames < windowFrames_)
        return;

    // Compute block RMS from accumulated mean-square
    float rmsDb = -INFINITY;
    float peakDb = -INFINITY;

    const double meanSquare = meter_.sumSquares / double(meter_.frames);
    const float rootMeanSquare = std::sqrt(static_cast<float>(meanSquare));
    rmsDb = db20_from_linear(rootMeanSquare);
    peakDb = db20_from_linear(meter_.peakAbs);

    // Publish atomically (read by main thread/JS)
    lastRmsDb_.store(rmsDb, std::memory_order_release);
    lastPeakDb_.store(peakDb, std::memory_order_release);

    // Reset for the next block
    meter_.sumSquares = 0.0;
    meter_.peakAbs = 0.0f;
    meter_.frames = 0;
}