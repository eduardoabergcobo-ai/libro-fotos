/* ==========================================================
   EDITOR DE LIBRO DE FOTOS
   Todo se guarda automáticamente en este navegador (localStorage).
   Cuando termines, usá "Descargar para publicar" y subí el
   archivo index.html que se descarga a tu repositorio de GitHub.
   ========================================================== */

const CLAVE_GUARDADO = "libroFotosEditor_v2";

function elementoTitulo() {
  return { tipo: "titulo", x: 10, y: 30, w: 80, h: 18, fontSize: 9, texto: "Nuestro Libro de Fotos" };
}
function elementoSubtitulo() {
  return { tipo: "subtitulo", x: 10, y: 50, w: 80, h: 10, fontSize: 4.2, texto: "Un recuerdo para siempre" };
}
function hojaVacia(fondo) {
  return { fondo: fondo || { tipo: "color", valor: "#fffdf8" }, elementos: [] };
}

function estadoPorDefecto() {
  return {
    tapa: {
      fondo: { tipo: "color", valor: "#2b1d14" },
      elementos: [elementoTitulo(), elementoSubtitulo()]
    },
    paginas: [
      hojaVacia({ tipo: "color", valor: "#fffdf8" })
    ],
    contratapa: {
      fondo: { tipo: "color", valor: "#2b1d14" },
      elementos: [
        { tipo: "texto", x: 15, y: 42, w: 70, h: 16, fontSize: 4.5, texto: "Gracias por mirar nuestro libro" }
      ]
    }
  };
}

/* Convierte datos guardados con la versión vieja del editor (sin tapa/contratapa) */
function migrarEstado(viejo) {
  if (viejo && viejo.tapa && viejo.contratapa && Array.isArray(viejo.paginas)) return viejo;
  const nuevo = estadoPorDefecto();
  if (viejo && viejo.titulo) nuevo.tapa.elementos[0].texto = viejo.titulo;
  if (viejo && viejo.subtitulo) nuevo.tapa.elementos[1].texto = viejo.subtitulo;
  if (viejo && Array.isArray(viejo.paginas) && viejo.paginas.length) {
    nuevo.paginas = viejo.paginas.map((p) => ({
      fondo: p.fondo || { tipo: "color", valor: "#fffdf8" },
      elementos: p.elementos || []
    }));
  }
  return nuevo;
}

function cargarEstado() {
  try {
    const guardado = localStorage.getItem(CLAVE_GUARDADO);
    if (guardado) return migrarEstado(JSON.parse(guardado));
  } catch (e) { /* si está corrupto, arrancamos de cero */ }
  return estadoPorDefecto();
}

function guardarEstado() {
  localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado));
}

let estado = cargarEstado();
let posicion = 0; // 0 = tapa, último = contratapa, el resto son páginas

/* ---------- POSICIÓN / NAVEGACIÓN ---------- */
function totalPosiciones() {
  return estado.paginas.length + 2;
}
function tipoEnPosicion(pos) {
  if (pos === 0) return "tapa";
  if (pos === totalPosiciones() - 1) return "contratapa";
  return "pagina";
}
function hojaEnPosicion(pos) {
  const tipo = tipoEnPosicion(pos);
  if (tipo === "tapa") return estado.tapa;
  if (tipo === "contratapa") return estado.contratapa;
  return estado.paginas[pos - 1];
}

/* ---------- REFERENCIAS DOM ---------- */
const hoja = document.getElementById("hoja");
const indicadorPagina = document.getElementById("indicadorPagina");
const btnPaginaPrev = document.getElementById("btnPaginaPrev");
const btnPaginaNext = document.getElementById("btnPaginaNext");
const btnPaginaBorrar = document.getElementById("btnPaginaBorrar");
const panelFondo = document.getElementById("panelFondo");
const panelDisenos = document.getElementById("panelDisenos");

/* ---------- RENDER ---------- */
function render() {
  const hojaObj = hojaEnPosicion(posicion);
  aplicarFondo(hoja, hojaObj.fondo);

  hoja.innerHTML = "";
  const cuadricula = document.createElement("div");
  cuadricula.className = "cuadricula";
  hoja.appendChild(cuadricula);
  hojaObj.elementos.forEach((el, idx) => {
    hoja.appendChild(crearElementoDOM(el, idx, hojaObj));
  });

  const tipo = tipoEnPosicion(posicion);
  if (tipo === "tapa") indicadorPagina.textContent = "Tapa";
  else if (tipo === "contratapa") indicadorPagina.textContent = "Contratapa";
  else indicadorPagina.textContent = `Página ${posicion} / ${estado.paginas.length}`;

  btnPaginaPrev.disabled = posicion === 0;
  btnPaginaNext.disabled = posicion === totalPosiciones() - 1;
  btnPaginaBorrar.disabled = tipo !== "pagina";

  if (!panelFondo.classList.contains("oculto")) construirPanelFondo();
}

function aplicarFondo(elHoja, fondo) {
  if (fondo && fondo.tipo === "foto") {
    elHoja.style.backgroundImage = `url(${fondo.valor})`;
    elHoja.style.backgroundSize = "cover";
    elHoja.style.backgroundPosition = "center";
  } else {
    elHoja.style.backgroundImage = "none";
    elHoja.style.backgroundColor = (fondo && fondo.valor) || "#fffdf8";
  }
}

function crearElementoDOM(el, idx, hojaObj) {
  const wrapper = document.createElement("div");
  wrapper.className = "elemento " + el.tipo + (el.vacio ? " vacio" : "");
  wrapper.style.left = el.x + "%";
  wrapper.style.top = el.y + "%";
  wrapper.style.width = el.w + "%";
  wrapper.style.height = el.h + "%";

  if (el.tipo === "foto") {
    if (el.vacio) {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder-foto";
      placeholder.innerHTML = "<span>📷</span><span>Tocá para subir foto</span>";
      wrapper.appendChild(placeholder);
      wrapper.addEventListener("click", (e) => {
        if (e.target.closest(".handle-resize, .handle-borrar, .grip")) return;
        subirFotoParaSlot(el, hojaObj);
      });
    } else {
      const img = document.createElement("img");
      img.src = el.src;
      img.draggable = false;
      wrapper.appendChild(img);
    }
    wrapper.addEventListener("pointerdown", (e) => {
      if (el.vacio) return;
      if (e.target.closest(".handle-resize, .handle-borrar")) return;
      iniciarArrastre(e, el, wrapper);
    });
  } else {
    const contenido = document.createElement("div");
    contenido.className = "contenido";
    contenido.contentEditable = "true";
    contenido.spellcheck = false;
    contenido.style.fontSize = el.fontSize + "cqw";
    contenido.textContent = el.texto;
    contenido.addEventListener("pointerdown", (e) => e.stopPropagation());
    let temporizadorGuardado;
    contenido.addEventListener("input", () => {
      el.texto = contenido.textContent;
      clearTimeout(temporizadorGuardado);
      temporizadorGuardado = setTimeout(guardarEstado, 400);
    });
    wrapper.appendChild(contenido);
  }

  const grip = document.createElement("span");
  grip.className = "grip";
  grip.textContent = "⠿";
  grip.addEventListener("pointerdown", (e) => iniciarArrastre(e, el, wrapper));
  wrapper.appendChild(grip);

  const handleResize = document.createElement("span");
  handleResize.className = "handle-resize";
  handleResize.textContent = "⤡";
  handleResize.addEventListener("pointerdown", (e) => iniciarRedimension(e, el, wrapper));
  wrapper.appendChild(handleResize);

  if (el.tipo !== "titulo" && el.tipo !== "subtitulo") {
    const handleBorrar = document.createElement("span");
    handleBorrar.className = "handle-borrar";
    handleBorrar.textContent = "×";
    handleBorrar.addEventListener("click", (e) => {
      e.stopPropagation();
      hojaObj.elementos.splice(idx, 1);
      guardarEstado();
      render();
    });
    wrapper.appendChild(handleBorrar);
  }

  return wrapper;
}

/* ---------- ARRASTRAR / REDIMENSIONAR ---------- */
function iniciarArrastre(e, el, wrapper) {
  e.preventDefault();
  e.stopPropagation();
  const rectHoja = hoja.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const startLeft = el.x;
  const startTop = el.y;

  function mover(ev) {
    const dxPct = ((ev.clientX - startX) / rectHoja.width) * 100;
    const dyPct = ((ev.clientY - startY) / rectHoja.height) * 100;
    el.x = clamp(startLeft + dxPct, 0, 100 - el.w);
    el.y = clamp(startTop + dyPct, 0, 100 - el.h);
    wrapper.style.left = el.x + "%";
    wrapper.style.top = el.y + "%";
  }
  function soltar() {
    document.removeEventListener("pointermove", mover);
    document.removeEventListener("pointerup", soltar);
    guardarEstado();
  }
  document.addEventListener("pointermove", mover);
  document.addEventListener("pointerup", soltar);
}

function iniciarRedimension(e, el, wrapper) {
  e.preventDefault();
  e.stopPropagation();
  const rectHoja = hoja.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const startW = el.w;
  const startH = el.h;

  function mover(ev) {
    const dwPct = ((ev.clientX - startX) / rectHoja.width) * 100;
    const dhPct = ((ev.clientY - startY) / rectHoja.height) * 100;
    el.w = clamp(startW + dwPct, 6, 100 - el.x);
    el.h = clamp(startH + dhPct, 6, 100 - el.y);
    wrapper.style.width = el.w + "%";
    wrapper.style.height = el.h + "%";
  }
  function soltar() {
    document.removeEventListener("pointermove", mover);
    document.removeEventListener("pointerup", soltar);
    guardarEstado();
  }
  document.addEventListener("pointermove", mover);
  document.addEventListener("pointerup", soltar);
}

function clamp(valor, min, max) {
  if (max < min) max = min;
  return Math.max(min, Math.min(max, valor));
}

/* ---------- SUBIR FOTOS (libres) ---------- */
const inputFoto = document.getElementById("inputFoto");
document.getElementById("btnFoto").addEventListener("click", () => inputFoto.click());

inputFoto.addEventListener("change", async (e) => {
  const archivos = Array.from(e.target.files);
  const hojaObj = hojaEnPosicion(posicion);
  let offset = 0;
  for (const archivo of archivos) {
    const dataUrl = await leerComoDataURL(archivo);
    hojaObj.elementos.push({
      tipo: "foto", vacio: false, src: dataUrl,
      x: 8 + offset, y: 8 + offset, w: 55, h: 55
    });
    offset = (offset + 5) % 25;
  }
  guardarEstado();
  render();
  inputFoto.value = "";
});

function leerComoDataURL(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

function subirFotoParaSlot(el) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", async () => {
    if (!input.files[0]) return;
    el.src = await leerComoDataURL(input.files[0]);
    el.vacio = false;
    guardarEstado();
    render();
  });
  input.click();
}

/* ---------- AGREGAR TEXTO ---------- */
document.getElementById("btnTexto").addEventListener("click", () => {
  hojaEnPosicion(posicion).elementos.push({
    tipo: "texto", x: 15, y: 15, w: 40, h: 20, fontSize: 5,
    texto: "Escribí acá tu texto"
  });
  guardarEstado();
  render();
});

/* ---------- DISEÑOS (varias fotos por página, estilo historias) ---------- */
const DISENOS = [
  { id: "una", celdas: [{ x: 2, y: 2, w: 96, h: 96 }] },
  { id: "dos-v", celdas: [{ x: 2, y: 2, w: 47, h: 96 }, { x: 51, y: 2, w: 47, h: 96 }] },
  { id: "dos-h", celdas: [{ x: 2, y: 2, w: 96, h: 47 }, { x: 2, y: 51, w: 96, h: 47 }] },
  { id: "tres-a", celdas: [{ x: 2, y: 2, w: 96, h: 63 }, { x: 2, y: 67, w: 47, h: 31 }, { x: 51, y: 67, w: 47, h: 31 }] },
  { id: "tres-b", celdas: [{ x: 2, y: 2, w: 47, h: 31 }, { x: 51, y: 2, w: 47, h: 31 }, { x: 2, y: 35, w: 96, h: 63 }] },
  { id: "cuatro", celdas: [{ x: 2, y: 2, w: 47, h: 47 }, { x: 51, y: 2, w: 47, h: 47 }, { x: 2, y: 51, w: 47, h: 47 }, { x: 51, y: 51, w: 47, h: 47 }] },
  { id: "lateral", celdas: [{ x: 2, y: 2, w: 63, h: 96 }, { x: 67, y: 2, w: 31, h: 31 }, { x: 67, y: 35, w: 31, h: 31 }, { x: 67, y: 68, w: 31, h: 30 }] }
];

function construirPanelDisenos() {
  panelDisenos.innerHTML = "";
  DISENOS.forEach((d) => {
    const boton = document.createElement("button");
    boton.className = "miniatura-diseno";
    boton.title = "Aplicar este diseño a la página actual";
    const caja = document.createElement("div");
    caja.className = "caja-mini";
    d.celdas.forEach((c) => {
      const r = document.createElement("span");
      r.style.left = c.x + "%";
      r.style.top = c.y + "%";
      r.style.width = c.w + "%";
      r.style.height = c.h + "%";
      caja.appendChild(r);
    });
    boton.appendChild(caja);
    boton.addEventListener("click", () => {
      aplicarDiseno(d);
      panelDisenos.classList.add("oculto");
    });
    panelDisenos.appendChild(boton);
  });
}

function aplicarDiseno(diseno) {
  const hojaObj = hojaEnPosicion(posicion);
  const noFotos = hojaObj.elementos.filter((e) => e.tipo !== "foto");
  const fotosConSrc = hojaObj.elementos.filter((e) => e.tipo === "foto" && !e.vacio);

  const nuevasFotos = diseno.celdas.map((c, i) => {
    const existente = fotosConSrc[i];
    return existente
      ? { tipo: "foto", vacio: false, src: existente.src, x: c.x, y: c.y, w: c.w, h: c.h }
      : { tipo: "foto", vacio: true, x: c.x, y: c.y, w: c.w, h: c.h };
  });

  hojaObj.elementos = [...noFotos, ...nuevasFotos];
  guardarEstado();
  render();
}

document.getElementById("btnDisenos").addEventListener("click", () => {
  panelFondo.classList.add("oculto");
  const abrir = panelDisenos.classList.contains("oculto");
  panelDisenos.classList.toggle("oculto");
  if (abrir) construirPanelDisenos();
});

/* ---------- FONDO (color o foto) ---------- */
const COLORES_FONDO = [
  "#2b1d14", "#fffdf8", "#1d2b3a", "#1d3a24", "#3a1d24",
  "#ffffff", "#111111", "#f5dde0", "#dbe9f5", "#d4af37"
];

function construirPanelFondo() {
  panelFondo.innerHTML = "";
  const hojaObj = hojaEnPosicion(posicion);

  const fila = document.createElement("div");
  fila.className = "fila-colores";
  COLORES_FONDO.forEach((c) => {
    const sw = document.createElement("button");
    sw.className = "swatch";
    sw.style.background = c;
    if (hojaObj.fondo.tipo === "color" && hojaObj.fondo.valor === c) sw.classList.add("activo");
    sw.addEventListener("click", () => {
      hojaObj.fondo = { tipo: "color", valor: c };
      guardarEstado();
      render();
    });
    fila.appendChild(sw);
  });
  panelFondo.appendChild(fila);

  const filaAcciones = document.createElement("div");
  filaAcciones.className = "fila-acciones-fondo";

  const labelColor = document.createElement("label");
  labelColor.className = "btn";
  labelColor.textContent = "🎨 Color personalizado";
  const inputColor = document.createElement("input");
  inputColor.type = "color";
  inputColor.className = "input-color-oculto";
  inputColor.value = hojaObj.fondo.tipo === "color" ? hojaObj.fondo.valor : "#ffffff";
  inputColor.addEventListener("input", () => {
    hojaObj.fondo = { tipo: "color", valor: inputColor.value };
    guardarEstado();
    render();
  });
  labelColor.appendChild(inputColor);
  filaAcciones.appendChild(labelColor);

  const btnFotoFondo = document.createElement("button");
  btnFotoFondo.className = "btn";
  btnFotoFondo.textContent = "🖼 Usar una foto de fondo";
  btnFotoFondo.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", async () => {
      if (!input.files[0]) return;
      const dataUrl = await leerComoDataURL(input.files[0]);
      hojaObj.fondo = { tipo: "foto", valor: dataUrl };
      guardarEstado();
      render();
    });
    input.click();
  });
  filaAcciones.appendChild(btnFotoFondo);

  if (hojaObj.fondo.tipo === "foto") {
    const btnQuitar = document.createElement("button");
    btnQuitar.className = "btn btn-peligro";
    btnQuitar.textContent = "Quitar foto de fondo";
    btnQuitar.addEventListener("click", () => {
      hojaObj.fondo = { tipo: "color", valor: "#fffdf8" };
      guardarEstado();
      render();
    });
    filaAcciones.appendChild(btnQuitar);
  }

  panelFondo.appendChild(filaAcciones);
}

document.getElementById("btnFondo").addEventListener("click", () => {
  panelDisenos.classList.add("oculto");
  const abrir = panelFondo.classList.contains("oculto");
  panelFondo.classList.toggle("oculto");
  if (abrir) construirPanelFondo();
});

/* ---------- PÁGINAS ---------- */
document.getElementById("btnPaginaNueva").addEventListener("click", () => {
  const tipo = tipoEnPosicion(posicion);
  let indiceInsercion;
  if (tipo === "tapa") indiceInsercion = 0;
  else if (tipo === "contratapa") indiceInsercion = estado.paginas.length;
  else indiceInsercion = posicion;

  estado.paginas.splice(indiceInsercion, 0, hojaVacia());
  posicion = indiceInsercion + 1;
  guardarEstado();
  render();
});

btnPaginaBorrar.addEventListener("click", () => {
  if (tipoEnPosicion(posicion) !== "pagina") return;
  if (!confirm("¿Borrar esta página y todo su contenido?")) return;
  estado.paginas.splice(posicion - 1, 1);
  posicion = Math.max(0, Math.min(posicion, totalPosiciones() - 1));
  guardarEstado();
  render();
});

btnPaginaPrev.addEventListener("click", () => {
  if (posicion > 0) { posicion--; render(); }
});
btnPaginaNext.addEventListener("click", () => {
  if (posicion < totalPosiciones() - 1) { posicion++; render(); }
});

/* ---------- VACIAR TODO ---------- */
document.getElementById("btnVaciar").addEventListener("click", () => {
  if (!confirm("Esto borra todas las fotos y textos de este navegador. ¿Seguro?")) return;
  estado = estadoPorDefecto();
  posicion = 0;
  guardarEstado();
  render();
});

/* ---------- EXPORTAR ---------- */
function generarHTMLExportado() {
  const datosSeguros = JSON.stringify(estado).replace(/</g, "\\u003c");
  const elTitulo = estado.tapa.elementos.find((e) => e.tipo === "titulo");
  const tituloPagina = escaparHTML(elTitulo ? elTitulo.texto : "Mi Libro de Fotos");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tituloPagina}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="escenario">
    <div class="libro">
      <button id="btnPrev" class="flecha flecha-izq oculto" aria-label="Página anterior">&#10094;</button>
      <div class="hoja-contenedor">
        <div class="hoja" id="hoja"></div>
        <button id="btnAbrir" class="boton boton-abrir">Abrir libro</button>
        <div class="contador oculto" id="contador"></div>
      </div>
      <button id="btnNext" class="flecha flecha-der oculto" aria-label="Página siguiente">&#10095;</button>
    </div>
  </div>
<script>
window.DATOS_LIBRO = ${datosSeguros};
<\/script>
<script src="script.js"></script>
</body>
</html>
`;
}

function escaparHTML(texto) {
  const d = document.createElement("div");
  d.textContent = texto;
  return d.innerHTML;
}

document.getElementById("btnDescargar").addEventListener("click", () => {
  const html = generarHTMLExportado();
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "index.html";
  a.click();
  URL.revokeObjectURL(url);
});

const overlayPreview = document.getElementById("overlayPreview");
const iframePreview = document.getElementById("iframePreview");

document.getElementById("btnVistaPrevia").addEventListener("click", () => {
  iframePreview.srcdoc = generarHTMLExportado();
  overlayPreview.classList.remove("oculto");
});

document.getElementById("btnCerrarPreview").addEventListener("click", () => {
  overlayPreview.classList.add("oculto");
  iframePreview.srcdoc = "";
});

/* ---------- ARRANQUE ---------- */
render();
