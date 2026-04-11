import { useState, type ChangeEvent } from "react";
import { useDialogBox, useSoundcardsInfo } from "../../hooks/index.js";
import type { AdminSoundcardsInfo } from "../../../../shared/types/index.js";
import setupWss from "../../managers/setupWss.js";

export function SoundcardSection() {
  const [isHidden, setIsHidden] = useState<boolean>(false);

  const [soundcardsInfo, setSoundcardsInfo] = useState<AdminSoundcardsInfo>([]);
  const serverSelectedDevice = soundcardsInfo.find((s) => s.selected);
  const firstDevice = soundcardsInfo[0];
  const [localSelectedId, setLocalSelectedId] = useState<number | "">("");
  const { setDialogBoxConfig } = useDialogBox();

  const unsavedChanges = serverSelectedDevice
    ? serverSelectedDevice.id !== localSelectedId
    : !!firstDevice;

  function handleSoundcardsInfo(info: AdminSoundcardsInfo): void {
    setSoundcardsInfo(info);
    const newServerSelectedDevice = info.find((s) => s.selected);
    const newFirstDevice = info[0];

    if (!unsavedChanges) {
      setLocalSelectedId(
        newServerSelectedDevice
          ? newServerSelectedDevice.id
          : newFirstDevice
            ? newFirstDevice.id
            : "",
      );
      return;
    }
    setLocalSelectedId(
      info.some((s) => s.id === localSelectedId)
        ? localSelectedId
        : newServerSelectedDevice
          ? newServerSelectedDevice.id
          : newFirstDevice
            ? newFirstDevice.id
            : "",
    );
  }
  useSoundcardsInfo(handleSoundcardsInfo);

  function handleSelectChange(e: ChangeEvent<HTMLSelectElement>): void {
    const newId: number = +e.currentTarget.value;
    setLocalSelectedId(newId);
  }

  function handleSaveChanges(e: React.MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();
    if (localSelectedId === "") return;
    setDialogBoxConfig({
      mainText: "Change sound device?",
      subText: "Audio will cut out while switching to the new device.",
      confirmText: "Change Soundcard Device",
      onConfirm: () => {
        setupWss.send("ADMIN_SOUNDCARD_CHANGE_REQUEST", {
          soundcardId: localSelectedId,
        });
      },
    });
  }

  return (
    <div className={`soundcard-section section${isHidden ? " hidden" : ""}`}>
      <h2
        className="soundcard-section-title section-title"
        onClick={() => setIsHidden((h) => !h)}
      >
        Soundcard: <span className="expanding-arrow closed">&#9660;</span>
        <span className="expanding-arrow open">&#9650;</span>
      </h2>
      <form className="form soundcard-form not-table">
        <div className="soundcard-title">
          <h2>Settings</h2>
        </div>
        <button
          type="submit"
          className="save-changes-btn btn"
          disabled={!unsavedChanges}
          onClick={handleSaveChanges}
        >
          Save Changes
        </button>
        <label htmlFor="soundcard-device">Device:</label>
        <select
          id="soundcard-device"
          className={unsavedChanges ? "input-changed" : ""}
          name="soundcard-device"
          value={localSelectedId}
          onChange={handleSelectChange}
        >
          {firstDevice ? (
            soundcardsInfo.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.name} (${s.maxInputChannels} input, ${s.maxOutputChannels} output, ${s.defaultSampleRate / 1000}kHz)`}
              </option>
            ))
          ) : (
            <option value="">No soundcard devices</option>
          )}
        </select>
      </form>
    </div>
  );
}
