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
    config: true,
    type: String,
    default: "sounds"
  });

});

Hooks.on("getSceneControlButtons", controls => {
  const sounds = controls.find(c => c.name === "sounds");
    if (!sounds) return;

  sounds.tools.push({
    name: "audiobrowser",
    title: game.i18n.localize("AUDIO_BROWSER.ButtonTitle"),
    icon: "fa-solid fa-music",
    button: true,
    visible: game.user.isGM,

    onClick: () => {
      log("Opening Audio Browser");
      openAudioBrowser();
    }
  });
});

function openAudioBrowser() {
  const defaultPath = game.settings.get(MODULE_ID, "defaultAudioPath") || "sounds";
  log("Opening audio browser with default path:", defaultPath);

  new foundry.applications.apps.FilePicker({
    type: "audio",
    current: defaultPath,
    callback: (path) => {
       log("Selected path:", path);
    }
  }).render(true);
}

