export function byId(id) {
    return document.getElementById(id);
}

export function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

export function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

export function openDialog(dialog) {
    if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
    }
}

export function closeDialog(dialog) {
    if (dialog && typeof dialog.close === "function") {
        dialog.close();
    }
}

//import call : import { byId, getQueryParam, toNumber, openDialog, closeDialog } from "./core/utils.js";