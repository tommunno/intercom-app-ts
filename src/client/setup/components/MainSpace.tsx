import { Banners } from "./layout/Banners.jsx";
import { OptionBar } from "./layout/OptionBar.jsx";
import { WebServerSection } from "./sections/WebServerSection.jsx";
import { LevelMetersSection } from "./sections/LevelMetersSection.jsx";
import { UsersSection } from "./sections/users-section/UsersSection.jsx";
import { PlsSection } from "./sections/pls-section/PlsSection.jsx";
import { ConfigSection } from "./sections/ConfigSection.jsx";
import { TroubleshootingSection } from "./sections/TroubleshootingSection.jsx";
import { AdminCredentialsSection } from "./sections/AdminCredentialsSection.jsx";
import { SoundcardSection } from "./sections/SoundcardSection.jsx";
import { LoggingSection } from "./sections/LoggingSection.jsx";

export function MainSpace() {
  return (
    <div className="main-space">
      <OptionBar />
      <Banners />
      <WebServerSection />
      <LevelMetersSection />
      <UsersSection />
      <PlsSection />
      <SoundcardSection />
      <ConfigSection />
      <TroubleshootingSection />
      <LoggingSection />
      <AdminCredentialsSection />
    </div>
  );
}
