#include "./include/Engine.h"
#include "./include/Soundcard.h"
#include "./include/RingBuffer.hpp"
#include "./include/AudioTypes.h"
#include "./include/Mixer.h"
#include "./include/Logger.h"
#include <utility>
#include <iostream>
#include <vector>

Engine::Engine(std::size_t numBufferedIo, int soundcardNumInputChannels, int soundcardNumOutputChannels, int soundcardDeviceId) : numBufferedIo_(numBufferedIo), soundcardNumInputChannels_(soundcardNumInputChannels), soundcardNumOutputChannels_(soundcardNumOutputChannels), soundcardDeviceId_(soundcardDeviceId), mixers(*this, numBufferedIo_, soundcardNumInputChannels_, soundcardNumOutputChannels_), soundcard(soundcardNumInputChannels_, soundcardNumOutputChannels_, soundcardDeviceId_), bufferedInputs(*this, numBufferedIo_)
{
    start();
}

void Engine::start()
{
    soundcard.openAndStartStream();
    mixers.start();
    bufferedInputs.start();
}

// Planar means one chunk of audio for buffered output 1,then one chunk of audio for buffered output 2 etc.
bool Engine::getPlanarBufferedOutputAudio(std::vector<float> &out)
{
    for (std::size_t i = 0; i < numBufferedIo_; ++i)
    {
        std::size_t size = mixers.getMixer(i).getWebrtcOutRing().size();
        if (size < 480)
            // There isn't enough audio to get 480 samples for every buffered output. Hence will return false.
            return false;
    }

    // size_t read(T *dst, size_t count) noexcept
    for (std::size_t i = 0; i < numBufferedIo_; ++i)
    {
        mixers.getMixer(i).getWebrtcOutRing().read(&out[i * 480], 480);
    }

    return true;
}

std::size_t Engine::getNumBufferedIo() const
{
    return numBufferedIo_;
}

std::size_t Engine::getNumInputs() const
{
    return numBufferedIo_ + static_cast<std::size_t>(soundcardNumInputChannels_);
}

void Engine::stop()
{
    if (stopped_)
        throw std::runtime_error("Engine already stopped, so cannot stop again.");

    std::string errors;

    try
    {
        soundcard.stopStream();
    }
    catch (const std::exception &e)
    {
        errors += "PortAudio: " + std::string(e.what()) + "\n";
    }

    try
    {
        soundcard.closeStream();
    }
    catch (const std::exception &e)
    {
        errors += "PortAudio: " + std::string(e.what()) + "\n";
    }

    // Any more things to stop go into new try and catch blocks here

    stopped_ = true;

    if (!errors.empty())
    {
        throw std::runtime_error("Errors during Engine::stop():\n" + errors);
    }
}

void Engine::setInputGains(const std::vector<int> &gains)
{
    for (size_t i = 0; i < numBufferedIo_; ++i)
    {
        bufferedInputs.getInput(i).setGain(gains[i]);
    }
    // Ultimately can set soundcard input gains here too
}

bool Engine::isSoundcardAlive()
{
    return soundcard.checkIfAlive();
}