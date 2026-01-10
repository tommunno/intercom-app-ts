// InputGate.hpp
#pragma once
#include <cstddef>
#include <algorithm>
#include "RingBuffer.hpp"

class InputGate
{
public:
    std::size_t inputId;
    enum class State
    {
        PreRoll,
        Playing
    };

    // thresholds in SAMPLES (frames * channels)
    InputGate(std::size_t inpId, SpscRingBuffer<float> &rb,
              std::size_t startThresholdSamples,
              std::size_t restartThresholdSamples)
        : inputId(inpId),
          rb_(rb),
          startThr_(startThresholdSamples),
          restartThr_(restartThresholdSamples),
          state_(State::PreRoll) {}

    void reset() { state_ = State::PreRoll; }

    State state() const { return state_; }

    // Call from your PortAudio output callback.
    // Writes exactly `numSamples` to `out` (silence padded if needed).
    void process(float *out, std::size_t numSamples)
    {
        // std::cout << "In inputGate::process for inputId: " << inputId << "\n";
        if (state_ == State::PreRoll)
        {
            // Stay silent until we have enough buffered
            if (rb_.size() < startThr_)
            {
                std::fill(out, out + numSamples, 0.0f);
                return;
            }
            state_ = State::Playing;
        }

        // Playing: try to read the requested amount
        const std::size_t got = rb_.read(out, numSamples);
        if (got < numSamples)
        {
            // Underrun: pad with silence and re-enter pre-roll if we're low
            std::fill(out + got, out + numSamples, 0.0f);
            if (rb_.size() < restartThr_)
            {
                state_ = State::PreRoll;
            }
        }
    }

    // Helper to set thresholds in ms (samples = ms * SR * channels / 1000).
    void setThresholdMs(double startMs, double restartMs,
                        double sampleRate, std::size_t channels)
    {
        startThr_ = static_cast<std::size_t>(startMs * 0.001 * sampleRate * channels);
        restartThr_ = static_cast<std::size_t>(restartMs * 0.001 * sampleRate * channels);
    }

private:
    SpscRingBuffer<float> &rb_;
    std::size_t startThr_;
    std::size_t restartThr_;
    State state_;
};
