#ifndef MIXER_H
#define MIXER_H

#include "AudioTypes.h"
#include <vector>
#include <functional>
#include <cstddef>        // For std::size_t
#include "RingBuffer.hpp" // for SpscRingBuffer<float>

class Engine; // <-- forward declare (no include of Engine.h here)

class Mixer
{
    Engine &engine_;
    // std::vector<bool> crossPoints_;
    std::unique_ptr<std::atomic<uint8_t>[]> crossPoints_;
    std::size_t crossPointsCount_{0};
    std::vector<uint8_t> cpSnapshot_; // non-atomic, audio-thread only

    // --- WebRTC output path ---
    std::vector<float> webrtcScratch_;
    std::unique_ptr<SpscRingBuffer<float>> webrtcOut_; // ring for JS to read (float samples)

public:
    enum class Type
    {
        Soundcard,
        WebRTC,
    };

    Mixer(Engine &engine, std::size_t id, std::size_t numBufferedIo, std::size_t soundcardNumInputChannels, std::size_t soundcardNumOutputChannels, Type type = Type::WebRTC);
    void start();

    void updateCrosspoint(std::size_t channelIndex, bool state);

    SpscRingBuffer<float> &getWebrtcOutRing();

private:
    std::size_t id_;
    std::size_t numBufferedIo_;
    std::size_t soundcardNumInputChannels_;
    std::size_t soundcardNumOutputChannels_;
    Type type_;
    CallbackHandle audioCallbackHandle_;
    // std::function<void(const std::vector<int16_t> &)> mixerCallback_;
};

#endif