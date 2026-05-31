import { openFolderPicker } from "./folder-picker.js";

export const MODULE_ID = "audio-browser";

export function log(...args) {
  console.log(`${MODULE_ID} |`, ...args);
}

function getDefaultAudioLocation() {
  const raw = game.settings.get(MODULE_ID, "defaultAudioPath");
  if (typeof raw === "string") return { source: "data", path: raw };
  return { source: raw?.source ?? "data", path: raw?.path ?? "sounds" };
}

Hooks.once("init", () => {
  log("Audio Browser = Initialising");

  game.settings.register(MODULE_ID, "defaultAudioPath", {
    name: "AUDIO_BROWSER.DefaultAudioPath",
    hint: "AUDIO_BROWSER.DefaultAudioPathHint",
    scope: "world",
    config: false,
    type: Object,
    default: { source: "data", path: "sounds" }
  });

  game.settings.registerMenu(MODULE_ID, "chooseDefaultAudioPath", {
    name: "AUDIO_BROWSER.ChooseDefaultAudioPath",
    label: "AUDIO_BROWSER.ChooseDefaultAudioPathButton",
    hint: "AUDIO_BROWSER.ChooseDefaultAudioPathHint",
    icon: "fa-solid fa-folder-open",
    type: ChooseDefaultAudioPath,
    restricted: true
  });
});

Hooks.on("getSceneControlButtons", controls => {
  const sounds = controls.sounds;
  if (!sounds) return;

  sounds.tools.audioBrowser = {
    name: "audioBrowser",
    title: "AUDIO_BROWSER.ButtonTitle",
    icon: "fa-solid fa-folder-open",
    button: true,
    visible: game.user.isGM,
    onClick: openAudioBrowser
  };

  sounds.tools.audioBulkUpload = {
    name: "audioBulkUpload",
    title: "AUDIO_BROWSER.BulkUploadTitle",
    icon: "fa-solid fa-upload",
    button: true,
    visible: game.user.isGM,
    onClick: openBulkUpload
  };
});

function openAudioBrowser() {
  const { source, path } = getDefaultAudioLocation();
  log("Opening audio browser:", { source, path });

  const picker = new foundry.applications.apps.FilePicker.implementation({
    type: "audio",
    current: path
  });
  if (source && source !== "data") {
    try { picker.activeSource = source; } catch (err) { log("Could not set activeSource", err); }
  }
  picker.render(true);
}

class ChooseDefaultAudioPath extends foundry.applications.api.ApplicationV2 {
  render() {
    chooseDefaultAudioPath();
    return this;
  }
  close() {
    return Promise.resolve(this);
  }
}

function chooseDefaultAudioPath() {
  const { source, path } = getDefaultAudioLocation();

  openFolderPicker({
    source,
    current: path,
    callback: async ({ source: newSource, folder }) => {
      await game.settings.set(MODULE_ID, "defaultAudioPath", { source: newSource, path: folder });
      ui.notifications.info(game.i18n.format("AUDIO_BROWSER.DefaultFolderSet", { folder }));
      log("Default audio location updated:", { source: newSource, folder });
    }
  });
}

function openBulkUpload() {
  const defaultLocation = getDefaultAudioLocation();

  const content = document.createElement("p");
  content.append(game.i18n.localize("AUDIO_BROWSER.BulkUploadPromptPrefix") + " ");
  const folderEl = document.createElement("strong");
  folderEl.textContent = defaultLocation.path;
  content.append(folderEl);
  content.append(" " + game.i18n.localize("AUDIO_BROWSER.BulkUploadPromptSuffix"));

  foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("AUDIO_BROWSER.BulkUploadTitle") },
    content: content.outerHTML,
    buttons: [
      {
        action: "default",
        label: game.i18n.localize("AUDIO_BROWSER.BulkUploadUseDefault"),
        default: true,
        callback: () => pickAndUploadFiles(defaultLocation.source, defaultLocation.path)
      },
      {
        action: "choose",
        label: game.i18n.localize("AUDIO_BROWSER.BulkUploadChooseTarget"),
        callback: () => chooseTargetThenUpload(defaultLocation)
      }
    ]
  });
}

function chooseTargetThenUpload(start) {
  openFolderPicker({
    source: start.source,
    current: start.path,
    callback: ({ source, folder }) => pickAndUploadFiles(source, folder)
  });
}

function pickAndUploadFiles(source, folder) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = "audio/*";

  input.addEventListener("change", async () => {
    const files = Array.from(input.files);
    if (!files.length) return;

    log(`Uploading ${files.length} file(s) to ${folder}`);
    const progress = ui.notifications.info(
      game.i18n.format("AUDIO_BROWSER.BulkUploadProgress", { done: 0, total: files.length }),
      { progress: true }
    );

    let success = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await foundry.applications.apps.FilePicker.implementation.upload(source, folder, file, {}, { notify: false });
        success++;
      } catch (err) {
        console.error(`${MODULE_ID} | Failed to upload ${file.name}`, err);
      }
      progress.update({
        pct: (i + 1) / files.length,
        message: game.i18n.format("AUDIO_BROWSER.BulkUploadProgress", { done: i + 1, total: files.length })
      });
    }
    ui.notifications.info(game.i18n.format("AUDIO_BROWSER.BulkUploadDone", { count: success, folder }));
  });

  input.click();
}
