export const MODULE_ID = "audio-browser";

export function log(...args) {
  console.log(`${MODULE_ID} |`, ...args);
}

Hooks.once("init", () => {
  log("Audio Browser = Initialising");

  game.settings.register(MODULE_ID, "defaultAudioPath", {
    name: "AUDIO_BROWSER.DefaultAudioPath",
    hint: "AUDIO_BROWSER.DefaultAudioPathHint",
    scope: "world",
    config: false,
    type: String,
    default: "sounds"
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
  const defaultPath = game.settings.get(MODULE_ID, "defaultAudioPath");
  log("Opening audio browser with default path:", defaultPath);

  new foundry.applications.apps.FilePicker({
    type: "audio",
    current: defaultPath
  }).render(true);
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
  const currentPath = game.settings.get(MODULE_ID, "defaultAudioPath");

  new foundry.applications.apps.FilePicker({
    type: "audio",
    current: currentPath,
    callback: async path => {
      const folder = path.split("/").slice(0, -1).join("/");
      await game.settings.set(MODULE_ID, "defaultAudioPath", folder);
      ui.notifications.info(game.i18n.format("AUDIO_BROWSER.DefaultFolderSet", { folder }));
      log("Default audio path updated:", folder);
    }
  }).render(true);
}

function openBulkUpload() {
  const defaultFolder = game.settings.get(MODULE_ID, "defaultAudioPath");

  const content = document.createElement("p");
  content.append(game.i18n.localize("AUDIO_BROWSER.BulkUploadPromptPrefix") + " ");
  const folderEl = document.createElement("strong");
  folderEl.textContent = defaultFolder;
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
        callback: () => pickAndUploadFiles(defaultFolder)
      },
      {
        action: "choose",
        label: game.i18n.localize("AUDIO_BROWSER.BulkUploadChooseTarget"),
        callback: () => chooseTargetThenUpload(defaultFolder)
      }
    ]
  });
}

function chooseTargetThenUpload(startFolder) {
  new foundry.applications.apps.FilePicker({
    type: "audio",
    current: startFolder,
    callback: path => {
      const folder = path.split("/").slice(0, -1).join("/");
      pickAndUploadFiles(folder);
    }
  }).render(true);
}

function pickAndUploadFiles(folder) {
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
        await foundry.applications.apps.FilePicker.upload("data", folder, file, {}, { notify: false });
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
