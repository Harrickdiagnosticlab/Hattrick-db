pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const { PDFDocument, rgb, StandardFonts } = PDFLib;

/* ---------- Config (ported from the original desktop tool) ---------- */
const HATTRICK_TEXT = [
  "HATTRICK DIAGNOSTIC LAB",
  "35/18, Samy street, Egmore, Near by Childrens Hospital, Chennai - 600 008.",
  "Phone: 95 00 00 5061"
];
const HEADER_HEIGHT_DEFAULT = 100; // fallback only; real value now comes from the UI (mm -> pt)
const LOGO_WIDTH_DEFAULT = 80;
const LOGO_TOP_BUFFER = 10;
const LOGO_BOTTOM_BUFFER = 10;
const TEXT_LINE_HEIGHT = 18;
const MM_TO_PT = 2.83465;
const TEXT_SIDE_GAP = 10;      // gap kept between each logo and the text block
const TEXT_SIDE_MARGIN = 6;    // small breathing room inside the available text zone

const TITLE_COLOR = rgb(0.8, 0.2, 0.0);
const TEXT_COLOR = rgb(0.0, 0.0, 0.0);
const TITLE_FONT_SIZE = 22;
const ADDRESS_FONT_SIZE = 9;
const PHONE_FONT_SIZE = 10;
const MIN_TITLE_FONT_SIZE = 9;
const MIN_SMALL_FONT_SIZE = 5.5;

/* ---------- State ---------- */
let state = {
  pdfBytes: null,
  activePartnerId: null,   // id of a saved profile currently in use, or null if unsaved/new
  activePartner: null,     // { name, ownLogoBytes, partnerLogoBytes, mode, topMm, sideMm, headerMm, logoMm }
  newOwnLogoBytes: null,   // staged logo bytes while filling in the "new partner" form
  newPartnerLogoBytes: null,
  editingPartnerId: null,  // set when re-adding logos for a broken saved partner
  finalPdfBytes: null,
};

/* ---------- Saved partner profiles (persisted in this browser via localStorage) ---------- */
const PARTNER_STORAGE_KEY = "hattrick_header_tool_partners_v1";
let partnerProfiles = thcLoadPartnerProfiles();

function thcLoadPartnerProfiles() {
  try {
    const raw = localStorage.getItem(PARTNER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed : {};
  } catch (e) {
    return {}; // corrupted storage — start fresh rather than crash
  }
}
function thcSavePartnerProfilesToDisk() {
  try {
    localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(partnerProfiles));
    return true;
  } catch (e) {
    return false; // quota exceeded, storage disabled/private mode, etc.
  }
}
function thcBytesToB64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function thcB64ToBytesSafe(b64) {
  if (!b64) return null;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.length ? bytes : null;
  } catch (e) {
    return null;
  }
}
function thcMimeFor(bytes) {
  return thcDetectImageType(bytes) === "jpg" ? "image/jpeg" : "image/png";
}
function thcSlugify(name) {
  const s = (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (s || "partner") + "-" + Date.now().toString(36);
}
function thcEscapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function thcDetectImageType(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return "jpg";
  return "png";
}
async function embedImageAuto(pdfDoc, bytes) {
  const type = thcDetectImageType(bytes);
  return type === "jpg" ? pdfDoc.embedJpg(bytes) : pdfDoc.embedPng(bytes);
}
function thcFitBox(imgW, imgH, boxW, boxH) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale, h = imgH * scale;
  return { w, h, offX: (boxW - w) / 2, offY: (boxH - h) / 2 };
}
/* Shrink a font size (in .5pt steps) until the text fits maxWidth, never below minSize */
function thcFitFontSize(font, text, maxWidth, startSize, minSize) {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return Math.max(size, minSize);
}

/* ---------- Core header drawing (ported from insert_header_elements, now spacing-aware) ---------- */
async function drawHeader(page, pageWidth, pageHeight, ownImg, partnerImg, topPaddingPt, sidePaddingPt, fonts, headerHeightPt, logoWidthPt) {
  const TEXT_EXTRA_OFFSET = Math.min(5 * MM_TO_PT, headerHeightPt * 0.2);
  const toPdfY = (yTop) => pageHeight - yTop;

  // 1. Left (own) logo
  {
    const boxX = sidePaddingPt;
    const boxYTop = topPaddingPt + LOGO_TOP_BUFFER;
    const boxW = logoWidthPt;
    const boxH = Math.max(headerHeightPt - LOGO_TOP_BUFFER - LOGO_BOTTOM_BUFFER, 10);
    const fit = thcFitBox(ownImg.width, ownImg.height, boxW, boxH);
    const drawXTop = boxX + fit.offX;
    const drawYTop = boxYTop + fit.offY;
    page.drawImage(ownImg, { x: drawXTop, y: toPdfY(drawYTop + fit.h), width: fit.w, height: fit.h });
  }

  // 2. Right (partner) logo
  {
    const boxX = pageWidth - logoWidthPt - sidePaddingPt;
    const boxYTop = topPaddingPt + LOGO_TOP_BUFFER;
    const boxW = logoWidthPt;
    const boxH = Math.max(headerHeightPt - LOGO_TOP_BUFFER - LOGO_BOTTOM_BUFFER, 10);
    const fit = thcFitBox(partnerImg.width, partnerImg.height, boxW, boxH);
    const drawXTop = boxX + fit.offX;
    const drawYTop = boxYTop + fit.offY;
    page.drawImage(partnerImg, { x: drawXTop, y: toPdfY(drawYTop + fit.h), width: fit.w, height: fit.h });
  }

  // 3. Text zone — recomputed every time from the current spacing/sizes, so it always
  //    re-centers and re-fits between the two logos instead of overflowing them.
  const [title, address, phone] = HATTRICK_TEXT;

  let leftBound = sidePaddingPt + logoWidthPt + TEXT_SIDE_GAP;
  let rightBound = pageWidth - (sidePaddingPt + logoWidthPt + TEXT_SIDE_GAP);
  let availableWidth = Math.max(rightBound - leftBound - 2 * TEXT_SIDE_MARGIN, 20);
  const centerX = (leftBound + rightBound) / 2;

  const titleSize = thcFitFontSize(fonts.bold, title, availableWidth, TITLE_FONT_SIZE, MIN_TITLE_FONT_SIZE);
  const addressSize = thcFitFontSize(fonts.regular, address, availableWidth, ADDRESS_FONT_SIZE, MIN_SMALL_FONT_SIZE);
  const phoneSize = thcFitFontSize(fonts.regular, phone, availableWidth, PHONE_FONT_SIZE, MIN_SMALL_FONT_SIZE);

  const titleWidth = fonts.bold.widthOfTextAtSize(title, titleSize);
  const addressWidth = fonts.regular.widthOfTextAtSize(address, addressSize);
  const phoneWidth = fonts.regular.widthOfTextAtSize(phone, phoneSize);

  const totalTextHeight = 3 * TEXT_LINE_HEIGHT;
  const textBlockTop = topPaddingPt + TEXT_EXTRA_OFFSET + Math.max((headerHeightPt - totalTextHeight) / 2, 0);

  // Title — single clean draw with the real bold font (no faux-bold overdraw,
  // which was smearing adjacent letters like "TT" into each other)
  const titleX = centerX - titleWidth / 2;
  page.drawText(title, { x: titleX, y: toPdfY(textBlockTop), size: titleSize, font: fonts.bold, color: TITLE_COLOR });
  // Address
  page.drawText(address, { x: centerX - addressWidth / 2, y: toPdfY(textBlockTop + TEXT_LINE_HEIGHT), size: addressSize, font: fonts.regular, color: TEXT_COLOR });
  // Phone
  page.drawText(phone, { x: centerX - phoneWidth / 2, y: toPdfY(textBlockTop + 2 * TEXT_LINE_HEIGHT), size: phoneSize, font: fonts.regular, color: TEXT_COLOR });
}

/* Overlay mode (old behaviour): draws straight onto the existing page, whiting out
   the strip it covers. Only safe if the source PDF already has blank space up top. */
async function buildOverlayPdf(sourceBytes, ownLogoBytes, partnerLogoBytes, topPaddingPt, sidePaddingPt, onlyFirstPage, headerHeightPt, logoWidthPt) {
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const ownImg = await embedImageAuto(pdfDoc, ownLogoBytes);
  const partnerImg = await embedImageAuto(pdfDoc, partnerLogoBytes);
  const fonts = {
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
  };
  const pages = onlyFirstPage ? [pdfDoc.getPages()[0]] : pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - (topPaddingPt + headerHeightPt), width, height: headerHeightPt, color: rgb(1, 1, 1) });
    await drawHeader(page, width, height, ownImg, partnerImg, topPaddingPt, sidePaddingPt, fonts, headerHeightPt, logoWidthPt);
  }
  return pdfDoc.save();
}

/* Push-down mode (recommended, default): builds a fresh document, embeds each original
   page as-is at the bottom of a taller page, and draws the header only in the new strip
   added at the top. Original content is never covered, regardless of spacing. */
async function buildPushDownPdf(sourceBytes, ownLogoBytes, partnerLogoBytes, topPaddingPt, sidePaddingPt, onlyFirstPage, headerHeightPt, logoWidthPt) {
  const srcDoc = await PDFDocument.load(sourceBytes);
  const indices = onlyFirstPage ? [0] : srcDoc.getPageIndices();

  const outDoc = await PDFDocument.create();
  const ownImg = await embedImageAuto(outDoc, ownLogoBytes);
  const partnerImg = await embedImageAuto(outDoc, partnerLogoBytes);
  const fonts = {
    bold: await outDoc.embedFont(StandardFonts.HelveticaBold),
    regular: await outDoc.embedFont(StandardFonts.Helvetica),
  };
  const embeddedPages = await outDoc.embedPdf(sourceBytes, indices);
  const addedHeight = topPaddingPt + headerHeightPt;

  for (let i = 0; i < indices.length; i++) {
    const origSize = srcDoc.getPages()[indices[i]].getSize();
    const newHeight = origSize.height + addedHeight;
    const page = outDoc.addPage([origSize.width, newHeight]);

    // Original content, untouched, shifted to the bottom of the taller page
    page.drawPage(embeddedPages[i], { x: 0, y: 0, width: origSize.width, height: origSize.height });

    // Header drawn only in the newly added top strip
    page.drawRectangle({ x: 0, y: newHeight - addedHeight, width: origSize.width, height: addedHeight, color: rgb(1, 1, 1) });
    await drawHeader(page, origSize.width, newHeight, ownImg, partnerImg, topPaddingPt, sidePaddingPt, fonts, headerHeightPt, logoWidthPt);
  }
  return outDoc.save();
}

async function buildHeaderedPdf(sourceBytes, ownLogoBytes, partnerLogoBytes, topPaddingPt, sidePaddingPt, onlyFirstPage, mode, headerHeightPt, logoWidthPt) {
  return mode === "overlay"
    ? buildOverlayPdf(sourceBytes, ownLogoBytes, partnerLogoBytes, topPaddingPt, sidePaddingPt, onlyFirstPage, headerHeightPt, logoWidthPt)
    : buildPushDownPdf(sourceBytes, ownLogoBytes, partnerLogoBytes, topPaddingPt, sidePaddingPt, onlyFirstPage, headerHeightPt, logoWidthPt);
}

/* ---------- Generic file-picker wiring (uses the real input, no hiding tricks) ---------- */
function thcWireFilePicker({ pickerEl, inputEl, titleEl, subEl, thumbEl, iconEl, accept, onFile, emptyTitle }) {
  function thcHandleFile(file) {
    if (!file) return;
    if (accept === "pdf" && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      titleEl.textContent = "That's not a PDF — please choose a .pdf file";
      pickerEl.classList.remove("filled");
      return;
    }
    file.arrayBuffer().then((buf) => {
      const bytes = new Uint8Array(buf);
      onFile(bytes, file);
      pickerEl.classList.add("filled");
      titleEl.textContent = "✓ " + file.name;
      if (subEl) subEl.textContent = "Click \"Choose File\" above to pick a different one";
      if (thumbEl && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          thumbEl.src = ev.target.result;
          thumbEl.classList.remove("hidden");
          if (iconEl) iconEl.classList.add("hidden");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  inputEl.addEventListener("change", (e) => thcHandleFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((evt) =>
    pickerEl.addEventListener(evt, (e) => { e.preventDefault(); pickerEl.classList.add("drag-over"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    pickerEl.addEventListener(evt, (e) => { e.preventDefault(); pickerEl.classList.remove("drag-over"); })
  );
  pickerEl.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      inputEl.files = e.dataTransfer.files;
      thcHandleFile(file);
    }
  });
}

/* ---------- UI elements ---------- */
const previewBtn = document.getElementById("previewBtn");
const settingsStatus = document.getElementById("settingsStatus");
const previewCard = document.getElementById("previewCard");
const previewCanvas = document.getElementById("previewCanvas");
const adjustBtn = document.getElementById("adjustBtn");
const confirmBtn = document.getElementById("confirmBtn");
const genStatus = document.getElementById("genStatus");
const finalCard = document.getElementById("finalCard");
const finalFileLabel = document.getElementById("finalFileLabel");
const downloadBtn = document.getElementById("downloadBtn");
const printBtn = document.getElementById("printBtn");
const outputCard = document.getElementById("outputCard");
const newPartnerForm = document.getElementById("newPartnerForm");
const partnerGrid = document.getElementById("partnerGrid");
const savedPartnersWrap = document.getElementById("savedPartnersWrap");
const partnerLoadError = document.getElementById("partnerLoadError");

const pills = [1, 2, 3, 4].map((n) => document.getElementById("pill-" + n));
function thcSetPill(i, cls) {
  pills[i].classList.remove("active", "done");
  if (cls) pills[i].classList.add(cls);
}

function thcRefreshTopPills() {
  thcSetPill(0, state.pdfBytes ? "done" : "active");
  thcSetPill(1, state.activePartner ? "done" : (state.pdfBytes ? "active" : null));
}

/* ---------- Mode selector (used only inside the "new partner" form) ---------- */
const modeGroup = document.getElementById("modeGroup");
const spacingHint = document.getElementById("spacingHint");
function thcGetSelectedMode() {
  return document.querySelector('input[name="headerMode"]:checked').value;
}
function thcSetSelectedMode(mode) {
  document.querySelector(`input[name="headerMode"][value="${mode}"]`).checked = true;
  modeGroup.querySelectorAll(".mode-option").forEach((o) => o.classList.toggle("checked", o.dataset.mode === mode));
  spacingHint.textContent = mode === "overlay"
    ? "Top spacing here is measured from the current top edge of the page — the header will be drawn over whatever is already there in that strip."
    : "Top spacing is the gap before the header content; header height and logo width control how big the header block itself is. Smaller header = less extra space added. Title, address and phone text always re-center and auto-shrink to fit.";
}
modeGroup.querySelectorAll(".mode-option").forEach((opt) => {
  opt.addEventListener("click", () => {
    thcSetSelectedMode(opt.dataset.mode);
    thcUpdateTotalSpaceReadout();
  });
});

/* ---------- Live "total extra space" readout (new-partner form) ---------- */
const totalSpaceReadout = document.getElementById("totalSpaceReadout");
function thcUpdateTotalSpaceReadout() {
  const topMm = parseFloat(document.getElementById("topSpace").value) || 0;
  const headerMm = parseFloat(document.getElementById("headerHeight").value) || 0;
  const total = (topMm + headerMm).toFixed(1);
  if (thcGetSelectedMode() === "push") {
    totalSpaceReadout.textContent = `Total extra space that will be added at the top of every page: ${total} mm (top spacing + header height). Lower either value to push content down less.`;
  } else {
    totalSpaceReadout.textContent = `Header block covers ${headerMm} mm starting ${topMm} mm from the current top edge (existing content in that strip gets overlaid).`;
  }
}
["topSpace", "headerHeight", "logoSize"].forEach((id) => {
  document.getElementById(id).addEventListener("input", thcUpdateTotalSpaceReadout);
});
thcUpdateTotalSpaceReadout();

/* ---------- File pickers ---------- */
thcWireFilePicker({
  pickerEl: document.getElementById("pdfPicker"),
  inputEl: document.getElementById("pdfInput"),
  titleEl: document.getElementById("pdfTitle"),
  subEl: document.getElementById("pdfSub"),
  accept: "pdf",
  onFile: (bytes) => { state.pdfBytes = bytes; thcRefreshTopPills(); thcRefreshOutputCardIfVisible(); },
});

const usePartnerBtn = document.getElementById("usePartnerBtn");
function thcRefreshUsePartnerButton() {
  usePartnerBtn.disabled = !(state.newOwnLogoBytes && state.newPartnerLogoBytes);
}

thcWireFilePicker({
  pickerEl: document.getElementById("ownPicker"),
  inputEl: document.getElementById("ownInput"),
  titleEl: document.getElementById("ownTitle"),
  thumbEl: document.getElementById("ownThumb"),
  iconEl: document.getElementById("ownIconWrap"),
  accept: "image",
  onFile: (bytes) => { state.newOwnLogoBytes = bytes; thcRefreshUsePartnerButton(); },
});

thcWireFilePicker({
  pickerEl: document.getElementById("partnerPicker"),
  inputEl: document.getElementById("partnerInput"),
  titleEl: document.getElementById("partnerTitle"),
  thumbEl: document.getElementById("partnerThumb"),
  iconEl: document.getElementById("partnerIconWrap"),
  accept: "image",
  onFile: (bytes) => { state.newPartnerLogoBytes = bytes; thcRefreshUsePartnerButton(); },
});

/* ---------- Partner grid (saved profiles) ---------- */
function thcRenderPartnerGrid() {
  const ids = Object.keys(partnerProfiles);
  savedPartnersWrap.classList.toggle("hidden", ids.length === 0);
  partnerGrid.innerHTML = "";
  ids.forEach((id) => {
    const p = partnerProfiles[id];
    const ok = !!(p.ownLogoB64 && p.partnerLogoB64);
    const card = document.createElement("div");
    card.className = "partner-card" + (state.activePartnerId === id ? " selected" : "") + (ok ? "" : " error");
    const logosHtml = ok
      ? `<div class="pc-logos"><img src="data:${p.ownLogoMime || 'image/png'};base64,${p.ownLogoB64}" alt=""><img src="data:${p.partnerLogoMime || 'image/png'};base64,${p.partnerLogoB64}" alt=""></div>`
      : `<div class="pc-logos"><span class="pc-warn">⚠️</span></div>`;
    card.innerHTML = `${logosHtml}<div class="pc-name">${thcEscapeHtml(p.name || "Unnamed partner")}</div><button type="button" class="pc-del" title="Remove">✕</button>` +
      (ok ? "" : `<div class="pc-error-msg">Saved logo files are missing — tap to re-add them.</div>`);
    card.addEventListener("click", (e) => {
      if (e.target.closest(".pc-del")) return;
      thcSelectExistingPartner(id);
    });
    card.querySelector(".pc-del").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Remove saved partner "${p.name || "Unnamed partner"}"? This can't be undone.`)) {
        delete partnerProfiles[id];
        thcSavePartnerProfilesToDisk();
        if (state.activePartnerId === id) {
          state.activePartnerId = null;
          state.activePartner = null;
          outputCard.classList.add("hidden");
          thcRefreshTopPills();
        }
        thcRenderPartnerGrid();
      }
    });
    partnerGrid.appendChild(card);
  });
}

function thcSelectExistingPartner(id) {
  const p = partnerProfiles[id];
  if (!p) return;
  const ownBytes = thcB64ToBytesSafe(p.ownLogoB64);
  const partnerBytes = thcB64ToBytesSafe(p.partnerLogoB64);

  if (!ownBytes || !partnerBytes) {
    partnerLoadError.innerHTML = `⚠️ Couldn't load the saved logos for "<b>${thcEscapeHtml(p.name || "this partner")}</b>" — they seem to be missing from this browser's storage. <button type="button" class="btn-secondary" id="fixPartnerBtn" style="margin-left:6px;">Re-add logos</button>`;
    partnerLoadError.classList.remove("hidden");
    document.getElementById("fixPartnerBtn").addEventListener("click", () => thcOpenNewPartnerForm(p, id));
    state.activePartnerId = null;
    state.activePartner = null;
    outputCard.classList.add("hidden");
    thcRefreshTopPills();
    thcRenderPartnerGrid();
    return;
  }

  partnerLoadError.classList.add("hidden");
  state.activePartnerId = id;
  state.activePartner = {
    name: p.name || "Unnamed partner",
    ownLogoBytes: ownBytes,
    partnerLogoBytes: partnerBytes,
    mode: p.mode || "push",
    topMm: p.topMm, sideMm: p.sideMm, headerMm: p.headerMm, logoMm: p.logoMm,
  };
  newPartnerForm.classList.add("hidden");
  thcRenderPartnerGrid();
  thcRefreshTopPills();
  thcShowOutputCard();
}

function thcOpenNewPartnerForm(prefill, editingId) {
  state.editingPartnerId = editingId || null;
  state.newOwnLogoBytes = null;
  state.newPartnerLogoBytes = null;

  document.getElementById("partnerName").value = prefill ? (prefill.name || "") : "";
  document.getElementById("topSpace").value = prefill ? prefill.topMm : 0;
  document.getElementById("sideSpace").value = prefill ? prefill.sideMm : 15;
  document.getElementById("headerHeight").value = prefill ? prefill.headerMm : 28;
  document.getElementById("logoSize").value = prefill ? prefill.logoMm : 22;
  thcSetSelectedMode(prefill ? (prefill.mode || "push") : "push");
  thcUpdateTotalSpaceReadout();

  thcResetPicker("ownPicker", "ownTitle", "ownThumb", "ownIconWrap", "No logo selected yet");
  thcResetPicker("partnerPicker", "partnerTitle", "partnerThumb", "partnerIconWrap", "No logo selected yet");
  thcRefreshUsePartnerButton();

  document.getElementById("newPartnerStatus").classList.add("hidden");
  document.getElementById("cancelNewPartnerBtn").classList.toggle("hidden", Object.keys(partnerProfiles).length === 0);
  newPartnerForm.classList.remove("hidden");
  newPartnerForm.scrollIntoView({ behavior: "smooth", block: "start" });
}
function thcResetPicker(pickerId, titleId, thumbId, iconId, emptyText) {
  const picker = document.getElementById(pickerId);
  picker.classList.remove("filled");
  document.getElementById(titleId).textContent = emptyText;
  const thumb = document.getElementById(thumbId);
  thumb.classList.add("hidden");
  thumb.removeAttribute("src");
  document.getElementById(iconId).classList.remove("hidden");
}

document.getElementById("addPartnerBtn").addEventListener("click", () => thcOpenNewPartnerForm(null, null));
document.getElementById("cancelNewPartnerBtn").addEventListener("click", () => newPartnerForm.classList.add("hidden"));
document.getElementById("changePartnerBtn").addEventListener("click", () => {
  outputCard.classList.add("hidden");
  document.querySelectorAll(".card")[1].scrollIntoView({ behavior: "smooth", block: "start" });
});

usePartnerBtn.addEventListener("click", () => {
  const status = document.getElementById("newPartnerStatus");
  status.classList.add("hidden");

  const name = document.getElementById("partnerName").value.trim() || "Unnamed partner";
  const topMm = parseFloat(document.getElementById("topSpace").value);
  const sideMm = parseFloat(document.getElementById("sideSpace").value);
  const headerMm = parseFloat(document.getElementById("headerHeight").value);
  const logoMm = parseFloat(document.getElementById("logoSize").value);
  const mode = thcGetSelectedMode();

  if ([topMm, sideMm, headerMm, logoMm].some((v) => isNaN(v))) {
    status.textContent = "Please enter valid numeric values for the header settings.";
    status.className = "status err";
    status.classList.remove("hidden");
    return;
  }
  if (!state.newOwnLogoBytes || !state.newPartnerLogoBytes) {
    status.textContent = "Please select both logos before continuing.";
    status.className = "status err";
    status.classList.remove("hidden");
    return;
  }

  const id = state.editingPartnerId || thcSlugify(name);
  const wantSave = document.getElementById("savePartnerToggle").checked;
  let savedOk = true;

  if (wantSave) {
    partnerProfiles[id] = {
      name,
      ownLogoB64: thcBytesToB64(state.newOwnLogoBytes), ownLogoMime: thcMimeFor(state.newOwnLogoBytes),
      partnerLogoB64: thcBytesToB64(state.newPartnerLogoBytes), partnerLogoMime: thcMimeFor(state.newPartnerLogoBytes),
      mode, topMm, sideMm, headerMm, logoMm, savedAt: Date.now(),
    };
    savedOk = thcSavePartnerProfilesToDisk();
    if (!savedOk) {
      delete partnerProfiles[id];
      status.textContent = "⚠️ Couldn't save this partner on your device (storage full or blocked by the browser). You can still continue with this file, but you'll need to re-enter these details next time.";
      status.className = "status err";
      status.classList.remove("hidden");
    }
  }

  state.activePartnerId = (wantSave && savedOk) ? id : null;
  state.activePartner = {
    name, ownLogoBytes: state.newOwnLogoBytes, partnerLogoBytes: state.newPartnerLogoBytes,
    mode, topMm, sideMm, headerMm, logoMm,
  };
  newPartnerForm.classList.add("hidden");
  thcRenderPartnerGrid();
  thcRefreshTopPills();
  thcShowOutputCard();
});

function thcShowOutputCard() {
  outputCard.classList.remove("hidden");
  document.getElementById("activePartnerSummary").textContent =
    `Using "${state.activePartner.name}" — top ${state.activePartner.topMm}mm, side ${state.activePartner.sideMm}mm, header ${state.activePartner.headerMm}mm, logo ${state.activePartner.logoMm}mm.`;
  outputCard.scrollIntoView({ behavior: "smooth", block: "start" });
}
function thcRefreshOutputCardIfVisible() {
  // no-op placeholder kept for clarity; output card only needs a partner + pdf, both checked at generate time
}

thcRenderPartnerGrid();

async function renderPdfPageToCanvas(pdfBytes, canvas) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.6 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
}

previewBtn.addEventListener("click", async () => {
  settingsStatus.classList.add("hidden");
  if (!state.pdfBytes || !state.activePartner) {
    settingsStatus.textContent = "Please select an invoice PDF and a partner first.";
    settingsStatus.classList.remove("hidden");
    return;
  }
  const { topMm, sideMm, headerMm, logoMm, mode, ownLogoBytes, partnerLogoBytes } = state.activePartner;
  previewBtn.disabled = true;
  previewBtn.innerHTML = '<span class="spinner"></span>Rendering preview…';
  try {
    const previewBytes = await buildHeaderedPdf(
      state.pdfBytes, ownLogoBytes, partnerLogoBytes,
      topMm * MM_TO_PT, sideMm * MM_TO_PT, true, mode,
      headerMm * MM_TO_PT, logoMm * MM_TO_PT
    );
    await renderPdfPageToCanvas(previewBytes, previewCanvas);
    previewCard.classList.remove("hidden");
    previewCard.scrollIntoView({ behavior: "smooth", block: "start" });
    thcSetPill(2, "active");
    genStatus.textContent = "";
    genStatus.className = "status";
  } catch (err) {
    settingsStatus.textContent = "Couldn't render preview: " + err.message;
    settingsStatus.classList.remove("hidden");
  } finally {
    previewBtn.disabled = false;
    previewBtn.textContent = "Generate Preview";
  }
});

adjustBtn.addEventListener("click", () => {
  previewCard.classList.add("hidden");
  outputCard.scrollIntoView({ behavior: "smooth", block: "start" });
  thcSetPill(2, null);
});

confirmBtn.addEventListener("click", async () => {
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span class="spinner"></span>Generating final PDF…';
  genStatus.textContent = "";
  genStatus.className = "status";
  try {
    const { topMm, sideMm, headerMm, logoMm, mode, ownLogoBytes, partnerLogoBytes } = state.activePartner;
    state.finalPdfBytes = await buildHeaderedPdf(
      state.pdfBytes, ownLogoBytes, partnerLogoBytes,
      topMm * MM_TO_PT, sideMm * MM_TO_PT, false, mode,
      headerMm * MM_TO_PT, logoMm * MM_TO_PT
    );

    let outName = document.getElementById("outName").value.trim() || "output_Hattrick";
    if (!outName.toLowerCase().endsWith(".pdf")) outName += ".pdf";
    finalFileLabel.textContent = "Saved as: " + outName;
    finalCard.classList.remove("hidden");
    finalCard.scrollIntoView({ behavior: "smooth", block: "start" });
    thcSetPill(2, "done");
    thcSetPill(3, "active");
  } catch (err) {
    genStatus.textContent = "Couldn't generate the final PDF: " + err.message;
    genStatus.className = "status err";
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "✅ Looks good — Generate final PDF";
  }
});

downloadBtn.addEventListener("click", () => {
  if (!state.finalPdfBytes) return;
  let outName = document.getElementById("outName").value.trim() || "output_Hattrick";
  if (!outName.toLowerCase().endsWith(".pdf")) outName += ".pdf";
  const blob = new Blob([state.finalPdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = outName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  thcFullReset();
});

printBtn.addEventListener("click", () => {
  if (!state.finalPdfBytes) return;
  const blob = new Blob([state.finalPdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) win.addEventListener("load", () => { try { win.print(); } catch (e) {} });
});

/* ---------- Full reset — used after a successful download, and by the "Discard / Start over" button ---------- */
function thcFullReset() {
  state = {
    pdfBytes: null,
    activePartnerId: null,
    activePartner: null,
    newOwnLogoBytes: null,
    newPartnerLogoBytes: null,
    editingPartnerId: null,
    finalPdfBytes: null,
  };

  // Report PDF picker
  const pdfPicker = document.getElementById("pdfPicker");
  pdfPicker.classList.remove("filled");
  document.getElementById("pdfTitle").textContent = "No file selected yet";
  document.getElementById("pdfSub").textContent = "Choose the Report PDF, or drag & drop it onto this box";
  document.getElementById("pdfInput").value = "";
  document.getElementById("pdfStatus").classList.add("hidden");

  // Partner section
  newPartnerForm.classList.add("hidden");
  document.getElementById("cancelNewPartnerBtn").classList.add("hidden");
  document.getElementById("addPartnerBtn").classList.remove("hidden");
  partnerGrid.querySelectorAll(".partner-card").forEach((c) => c.classList.remove("selected"));
  thcResetPicker("ownPicker", "ownTitle", "ownThumb", "ownIconWrap", "No logo selected yet");
  thcResetPicker("partnerPicker", "partnerTitle", "partnerThumb", "partnerIconWrap", "No logo selected yet");
  document.getElementById("partnerName").value = "";

  // Output / preview / final cards
  outputCard.classList.add("hidden");
  previewCard.classList.add("hidden");
  finalCard.classList.add("hidden");
  document.getElementById("outName").value = "Patientname/age/Gender";
  genStatus.textContent = "";
  genStatus.className = "status";

  // Pills back to step 1
  thcRefreshTopPills();
  thcSetPill(2, null);
  thcSetPill(3, null);

  document.querySelector(".tool-header-changer .app-header").scrollIntoView({ behavior: "smooth", block: "start" });
}

const startOverBtn = document.getElementById("thcStartOverBtn");
if (startOverBtn) {
  startOverBtn.addEventListener("click", () => {
    if (confirm("Discard everything and start over? Anything not downloaded yet will be lost.")) {
      thcFullReset();
    }
  });
}

thcRefreshTopPills();
