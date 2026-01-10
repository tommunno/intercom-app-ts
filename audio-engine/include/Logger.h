#pragma once
#include <string>

namespace Logger
{
    // Public API:
    void LOG(std::string message, std::string type, bool toAdminPanel = true) noexcept;

    // Payload passed through TSFN:
    struct LogPayload
    {
        std::string message;
        std::string type;
        bool toAdminPanel = true;
    };

    // Log type constants:
    struct Types
    {
        inline static const std::string INFO = "INFO";
        inline static const std::string SUCCESS = "SUCCESS";
        inline static const std::string WARNING = "WARNING";
        inline static const std::string ERROR = "ERROR";
    };
}
