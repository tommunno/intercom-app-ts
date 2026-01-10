#include <vector>
#include "./include/Mixer.h"
#include "./include/Mixers.h"
#include "./include/Engine.h"
#include "./include/Logger.h"
#include <stdexcept>
#include <utility>

Mixers::Mixers(Engine &engine, std::size_t numBufferedIo, int soundcardNumInputChannels, int soundcardNumOutputChannels) : engine_(engine), numMixers_(numBufferedIo + soundcardNumOutputChannels), mixers_(std::vector<Mixer>())
{
    mixers_.reserve(numMixers_);

    std::size_t sNumIpC = static_cast<std::size_t>(soundcardNumInputChannels);
    std::size_t sNumOpC = static_cast<std::size_t>(soundcardNumOutputChannels);

    // Create WebRTC mixers:
    for (std::size_t i = 0; i < numBufferedIo; ++i)
    {
        mixers_.emplace_back(engine_, i, numBufferedIo, sNumIpC, sNumOpC, Mixer::Type::WebRTC);
    }

    // Create Soundcard mixers:
    for (size_t i = numBufferedIo; i < static_cast<size_t>(soundcardNumOutputChannels) + numBufferedIo; ++i)
    {
        mixers_.emplace_back(engine_, i, numBufferedIo, sNumIpC, sNumOpC, Mixer::Type::Soundcard);
    }
}

void Mixers::start()
{
    for (auto &mixer : mixers_)
    {
        mixer.start();
    }
}

Mixer &Mixers::getMixer(std::size_t mixerId)
{
    if (mixerId >= numMixers_)
    {
        throw std::out_of_range("Mixer ID out of range");
    }
    return mixers_[mixerId];
}