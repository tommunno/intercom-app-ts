#include <iostream>
#include "./include/Mixer.h"
#include "./include/AudioTypes.h"
#include "./include/Engine.h"
#include "./include/RingBuffer.hpp"
#include "./include/Logger.h"
#include <stdexcept>
#include <utility>
#include <cstdint>
#include <vector>

Mixer::Mixer(Engine &engine, std::size_t id, std::size_t numBufferedIo, std::size_t soundcardNumInputChannels, std::size_t soundcardNumOutputChannels, Type type) : engine_(engine), id_(id), numBufferedIo_(numBufferedIo), soundcardNumInputChannels_(soundcardNumInputChannels), soundcardNumOutputChannels_(soundcardNumOutputChannels), type_(type)
{
    Logger::LOG("Mixer created with ID: " + std::to_string(id_) + ", numBufferedIo: " + std::to_string(numBufferedIo_) + ", soundcardNumInputChannels: " + std::to_string(soundcardNumInputChannels_) + ", soundcardNumOutputChannels: " + std::to_string(soundcardNumOutputChannels_) + " and type: " + (type_ == Type::Soundcard ? "Soundcard" : "WebRTC"), Logger::Types::INFO, false);

    // Crosspoints:
    crossPointsCount_ = numBufferedIo_ + soundcardNumInputChannels_;
    crossPoints_ = std::make_unique<std::atomic<uint8_t>[]>(crossPointsCount_);
    for (std::size_t i = 0; i < crossPointsCount_; ++i)
        crossPoints_[i]
            .store(0u, std::memory_order_relaxed);

    cpSnapshot_.resize(crossPointsCount_);

    // --- WebRTC output path ---

    const std::size_t kMaxFrames = 480 * 2;

    webrtcScratch_.assign(kMaxFrames /* * channels(=1) */, 0.0f);

    // Generous capacity (e.g., ~160 ms): 16 chunks
    const std::size_t ringCapacity = kMaxFrames * 16;
    // Remember the power of 2 rounding up happens here, so will be more than ringCapacity
    webrtcOut_ = std::make_unique<SpscRingBuffer<float>>(id_, ringCapacity);
}

void Mixer::start()
{
    {
        audioCallbackHandle_ = engine_.soundcard.registerAudioCallback(
            /*priority=*/500,
            /*fn=*/
            [this](float *out, const float *in, unsigned long frames)
            {
                for (std::size_t i = 0; i < crossPointsCount_; ++i)
                    cpSnapshot_[i] = crossPoints_[i].load(std::memory_order_acquire);

                if (!out)
                    return;

                if (type_ == Type::Soundcard)
                {
                    const std::size_t soundcardOutputChannel = id_ - numBufferedIo_;
                    if (soundcardOutputChannel >= soundcardNumOutputChannels_)
                        return; // safety net

                    // ----- zero our target output channel -----
                    for (std::size_t f = 0; f < frames; ++f)
                        out[f * soundcardNumOutputChannels_ + soundcardOutputChannel] = 0.0f;

                    // ----- mix WebRTC buffered inputs -----
                    for (std::size_t j = 0; j < numBufferedIo_; ++j)
                    {
                        if (!cpSnapshot_[j])
                            continue;

                        // Get this input’s audio for this callback
                        auto &bufferedInput = engine_.bufferedInputs.getInput(j);
                        const float *src = bufferedInput.getAudio();

                        // Add into our target output channel
                        for (std::size_t f = 0; f < frames; ++f)
                            out[f * soundcardNumOutputChannels_ + soundcardOutputChannel] += src[f];
                    }

                    // ----- mix hardware input channels -----
                    if (in)
                    {
                        for (std::size_t k = 0; k < soundcardNumInputChannels_; ++k)
                        {
                            const std::size_t cpIndex = k + numBufferedIo_;

                            if (!cpSnapshot_[cpIndex])
                                continue;

                            // Add input channel k into our target output channel
                            for (std::size_t f = 0; f < frames; ++f)
                                out[f * soundcardNumOutputChannels_ + soundcardOutputChannel] += in[f * soundcardNumInputChannels_ + k];
                        }
                    }
                }

                else if (type_ == Type::WebRTC)
                {
                    // const std::size_t N = frames;
                    // zero scratch
                    float *dst = webrtcScratch_.data();
                    for (std::size_t f = 0; f < frames; ++f)
                        dst[f] = 0.0f;

                    // Mix WebRTC buffered inputs
                    for (std::size_t j = 0; j < numBufferedIo_; ++j)
                    {
                        if (!cpSnapshot_[j])
                            continue;
                        auto &bufferedInput = engine_.bufferedInputs.getInput(j);
                        const float *src = bufferedInput.getAudio();
                        for (std::size_t f = 0; f < frames; ++f)
                            dst[f] += src[f];
                    }

                    // Mix hardware input channels (if duplex input available)
                    if (in)
                    {
                        for (std::size_t k = 0; k < soundcardNumInputChannels_; ++k)
                        {
                            const std::size_t cpIndex = numBufferedIo_ + k;
                            if (!cpSnapshot_[cpIndex])
                                continue;
                            for (std::size_t f = 0; f < frames; ++f)
                                dst[f] += in[f * soundcardNumInputChannels_ + k];
                        }
                    }

                    // Push to per-mixer WebRTC ring (float PCM, mono)
                    webrtcOut_->write_overwrite(dst, frames);
                    return;
                }
            });
        Logger::LOG("Mixer started with ID: " + std::to_string(id_), Logger::Types::INFO, false);
    }
}

void Mixer::updateCrosspoint(std::size_t channelIndex, bool state)
{
    if (channelIndex >= crossPointsCount_)
        throw std::out_of_range("Channel index out of range");
    crossPoints_[channelIndex].store(state ? 1u : 0u, std::memory_order_release);
}

SpscRingBuffer<float> &Mixer::getWebrtcOutRing() { return *webrtcOut_; }