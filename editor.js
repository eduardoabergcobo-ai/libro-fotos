/* ==========================================================
   EDITOR DE LIBRO DE FOTOS
   Todo se guarda automáticamente en este navegador (localStorage).
   Cuando termines, usá "Descargar para publicar" y subí el
   archivo index.html que se descarga a tu repositorio de GitHub.
   ========================================================== */

const CLAVE_GUARDADO = "libroFotosEditor_v1";

const estadoPorDefecto = () => ({
  titulo: "Nuestro Libro de Fotos",
  subtitulo: "Un recuerdo para siempre",
  paginas: [
    {
      elementos: [
        {
          tipo: "texto", x: 10, y: 35, w: 80, h: 30, fontSize: 5,
          texto: "¡Bienvenido a tu libro! Tocá \"Agregar fotos\" o \"Agregar cuadro de texto\" para empezar."
        }
      ]
    }
  ]
});

let estado = cargarEstado();
let paginaActual = 0;

function cargarEstado() {
  try {
    const guardado = localStorage.getItem(CLAVE_GUARDADO);
    if (guardado) return JSON.parse(guardado);
  } catch (e) { /* si está corrupto, arrancamos de cero */ }
  return estadoPorDefecto();
}

function guardarEstado() {
  localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado));
}

/* ---------- REFERENCIAS DOM ---------- */
const elTitulo = document.getElementById("tituloEditable");
const elSubtitulo = document.getElementById("subtituloEditable");
const hoja = document.getElementById("hoja");
const indicadorPagina = document.getElementById("indicadorPagina");
const btnPaginaPrev = document.getElementById("btnPaginaPrev");
const btnPaginaNext = document.getElementById("btnPaginaNext");

/* ---------- RENDER ---------- */
function render() {
  elTitulo.textContent = estado.titulo;
  elSubtitulo.textContent = estado.subtitulo;

  hoja.innerHTML = "";
  const pagina = estado.paginas[paginaActual];
  pagina.elementos.forEach((el, idx) => {
    hoja.appendChild(crearElementoDOM(el, idx));
  });

  indicadorPagina.textContent = `Página ${paginaActual + 1} / ${estado.paginas.length}`;
  btnPaginaPrev.disabled = paginaActual === 0;
  btnPaginaNext.disabled = paginaActual === estado.paginas.length - 1;
}

function crearElementoDOM(el, idx) {
  const wrapper = document.createElement("div");
  wrapper.className = "elemento " + el.tipo;
  wrapper.style.left = el.x + "%";
  wrapper.style.top = el.y + "%";
  wrapper.style.width = el.w + "%";
  wrapper.style.height = el.h + "%";

  if (el.tipo === "foto") {
    const img = document.createElement("img");
    img.src = el.src;
    img.draggable = false;
    wrapper.appendChild(img);
    wrapper.addEventListener("pointerdown", (e) => {
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

  const handleBorrar = document.createElement("span");
  handleBorrar.className = "handle-borrar";
  handleBorrar.textContent = "×";
  handleBorrar.addEventListener("click", (e) => {
    e.stopPropagation();
    estado.paginas[paginaActual].elementos.splice(idx, 1);
    guardarEstado();
    render();
  });
  wrapper.appendChild(handleBorrar);

  return wrapper;
}

/* ---------- ARRASTRAR ---------- */
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

/* ---------- TÍTULO / SUBTÍTULO ---------- */
let temporizadorTitulo;
function autoguardarTitulos() {
  clearTimeout(temporizadorTitulo);
  temporizadorTitulo = setTimeout(() => {
    estado.titulo = elTitulo.textContent;
    estado.subtitulo = elSubtitulo.textContent;
    guardarEstado();
  }, 400);
}
elTitulo.addEventListener("input", autoguardarTitulos);
elSubtitulo.addEventListener("input", autoguardarTitulos);

/* ---------- SUBIR FOTOS ---------- */
const inputFoto = document.getElementById("inputFoto");
document.getElementById("btnFoto").addEventListener("click", () => inputFoto.click());

inputFoto.addEventListener("change", async (e) => {
  const archivos = Array.from(e.target.files);
  let offset = 0;
  for (const archivo of archivos) {
    const dataUrl = await leerComoDataURL(archivo);
    estado.paginas[paginaActual].elementos.push({
      tipo: "foto", src: dataUrl,
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

/* ---------- AGREGAR TEXTO ---------- */
document.getElementById("btnTexto").addEventListener("click", () => {
  estado.paginas[paginaActual].elementos.push({
    tipo: "texto", x: 15, y: 15, w: 40, h: 20, fontSize: 5,
    texto: "Escribí acá tu texto"
  });
  guardarEstado();
  render();
});

/* ---------- PÁGINAS ---------- */
document.getElementById("btnPaginaNueva").addEventListener("click", () => {
  estado.paginas.push({ elementos: [] });
  paginaActual = estado.paginas.length - 1;
  guardarEstado();
  render();
});

document.getElementById("btnPaginaBorrar").addEventListener("click", () => {
  if (estado.paginas.length <= 1) {
    alert("Tiene que quedar al menos una página.");
    return;
  }
  if (!confirm("¿Borrar esta página y todo su contenido?")) return;
  estado.paginas.splice(paginaActual, 1);
  paginaActual = Math.max(0, paginaActual - 1);
  guardarEstado();
  render();
});

btnPaginaPrev.addEventListener("click", () => {
  if (paginaActual > 0) { paginaActual--; render(); }
});
btnPaginaNext.addEventListener("click", () => {
  if (paginaActual < estado.paginas.length - 1) { paginaActual++; render(); }
});

/* ---------- VACIAR TODO ---------- */
document.getElementById("btnVaciar").addEventListener("click", () => {
  if (!confirm("Esto borra todas las fotos y textos de este navegador. ¿Seguro?")) return;
  estado = estadoPorDefecto();
  paginaActual = 0;
  guardarEstado();
  render();
});

/* ---------- EXPORTAR ---------- */
function generarHTMLExportado() {
  const datosSeguros = JSON.stringify(estado).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escaparHTML(estado.titulo || "Mi Libro de Fotos")}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="escenario">
    <section id="tapa" class="tapa">
      <h1 id="tituloLibro">Nuestro Libro de Fotos</h1>
      <p id="subtituloLibro">Un recuerdo para siempre</p>
      <button id="btnAbrir" class="boton">Abrir libro</button>
    </section>
    <section id="libro" class="libro oculto">
      <button id="btnPrev" class="flecha flecha-izq" aria-label="Página anterior">&#10094;</button>
      <div class="hoja-contenedor">
        <div class="hoja" id="hoja"></div>
        <div class="contador" id="contador"></div>
      </div>
      <button id="btnNext" class="flecha flecha-der" aria-label="Página siguiente">&#10095;</button>
    </section>
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

document.getElementById("btnVistaPrevia").addEventListener("click", () => {
  const html = generarHTMLExportado();
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
});

/* ---------- ARRANQUE ---------- */
render();
