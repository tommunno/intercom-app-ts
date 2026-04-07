import { Banners } from "./layout/Banners.jsx";
import { OptionBar } from "./layout/OptionBar.jsx";
import { WebServerSection } from "./sections/WebServerSection.jsx";
import { LevelMetersSection } from "./sections/LevelMetersSection.jsx";
import { UsersSection } from "./sections/users-section/UsersSection.jsx";
import { PlsSection } from "./sections/PlsSection.jsx";
import { ConfigSection } from "./sections/ConfigSection.jsx";
import { TroubleshootingSection } from "./sections/TroubleshootingSection.jsx";
import { AdminCredentialsSection } from "./sections/AdminCredentialsSection.jsx";
import { SoundcardSection } from "./sections/SoundcardSection.jsx";
import { LoggingSection } from "./sections/LoggingSection.jsx";
import type { DialogBoxConfig } from "./overlays/DialogBox.js";

export interface MainSpaceProps {
  onDialogBoxConfig: (config: DialogBoxConfig | null) => void;
}

export function MainSpace({ onDialogBoxConfig }: MainSpaceProps) {
  return (
    <div className="main-space">
      <OptionBar />
      <Banners />
      <WebServerSection />
      <LevelMetersSection />
      <UsersSection onDialogBoxConfig={onDialogBoxConfig} />
      <PlsSection />
      <SoundcardSection onDialogBoxConfig={onDialogBoxConfig} />
      <ConfigSection />
      <TroubleshootingSection />
      <LoggingSection />
      <AdminCredentialsSection />
    </div>
  );
}
