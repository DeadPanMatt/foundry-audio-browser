import { MODULE_ID, log } from "./main.js";

const FOLDER_MODE_FLAG = Symbol("audioBrowserFolderMode");
const FOLDER_CALLBACK = Symbol("audioBrowserFolderCallback");

export function openFolderPicker({ source = "data", current, callback }) {
  const picker = new foundry.applications.apps.FilePicker.implementation({
    type: "audio",
    current
  });
  picker[FOLDER_MODE_FLAG] = true;
  picker[FOLDER_CALLBACK] = callback;
  if (source && source !== "data") {
    try { picker.activeSource = source; } catch (err) { log("Could not set activeSource", err); }
  }
  picker.render(true);
  return picker;
}

Hooks.on("renderFilePicker", (app, element) => {
  if (!app[FOLDER_MODE_FLAG]) return;

  const root = element instanceof HTMLElement ? element : element?.[0];
  if (!root) return;

  if (root.querySelector("[data-audio-browser-use-folder]")) return;

  const footer = root.querySelector("footer") || root.querySelector(".form-footer");
  if (!footer) {
    console.warn(`${MODULE_ID} | Could not find FilePicker footer to inject Use Folder button`);
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.audioBrowserUseFolder = "";
  button.innerHTML = `<i class="fa-solid fa-folder-open"></i> <span>${game.i18n.localize("AUDIO_BROWSER.UseThisFolder")}</span>`;

  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();

    const activeSource = app.activeSource ?? app.source ?? "data";
    const folder = app.target ?? app.location ?? "";
    const cb = app[FOLDER_CALLBACK];
    log("Use This Folder:", { source: activeSource, folder });

    await app.close();
    if (cb) cb({ source: activeSource, folder });
  });

  footer.prepend(button);
});
