/* ==========================================================
   EDITOR DE LIBRO DE FOTOS
   Todo se guarda automáticamente en este navegador (localStorage).
   Cuando termines, usá "Descargar" y subí el archivo index.html
   que se descarga a tu repositorio de GitHub.
   ========================================================== */

const CLAVE_GUARDADO = "libroFotosEditor_v2"; // clave vieja (un solo libro), se usa para migrar
const CLAVE_REGISTRO = "libroFotosProyectos_v1";

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

/* Convierte datos guardados con versiones viejas del editor */
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

/* ==========================================================
   VARIOS PROYECTOS (libros) EN EL MISMO NAVEGADOR
   Cada proyecto se guarda con su propia clave; un "registro"
   lleva la lista de proyectos y cuál está activo.
   ========================================================== */
function prefijoProyecto(id) {
  return "libroFotosProyecto_" + id;
}
function generarId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function cargarRegistro() {
  try {
    const crudo = localStorage.getItem(CLAVE_REGISTRO);
    if (crudo) {
      const r = JSON.parse(crudo);
      if (Array.isArray(r.proyectos)) return r;
    }
  } catch (e) { /* registro corrupto: empezamos de nuevo */ }
  return { proyectos: [], proyectoActivoId: null };
}

function guardarRegistroDirecto(registro) {
  localStorage.setItem(CLAVE_REGISTRO, JSON.stringify(registro));
}

function leerEstadoDeProyecto(id) {
  try {
    const crudo = localStorage.getItem(prefijoProyecto(id));
    if (crudo) return migrarEstado(JSON.parse(crudo));
  } catch (e) { /* datos corruptos: se ignoran */ }
  return null;
}

function crearProyectoNuevo(nombre, estadoInicial) {
  const registro = cargarRegistro();
  const id = generarId();
  registro.proyectos.push({ id, nombre, creado: Date.now(), actualizado: Date.now() });
  registro.proyectoActivoId = id;
  localStorage.setItem(prefijoProyecto(id), JSON.stringify(estadoInicial));
  guardarRegistroDirecto(registro);
  return id;
}

function inicializarProyectos() {
  let registro = cargarRegistro();
  if (registro.proyectos.length === 0) {
    let estadoInicial = null;
    try {
      const crudo = localStorage.getItem(CLAVE_GUARDADO);
      if (crudo) estadoInicial = migrarEstado(JSON.parse(crudo));
    } catch (e) { /* nada que migrar */ }
    crearProyectoNuevo(estadoInicial ? "Mi primer libro" : "Mi libro de fotos", estadoInicial || estadoPorDefecto());
    registro = cargarRegistro();
  }
  if (!registro.proyectoActivoId || !registro.proyectos.some((p) => p.id === registro.proyectoActivoId)) {
    registro.proyectoActivoId = registro.proyectos[0].id;
    guardarRegistroDirecto(registro);
  }
  return leerEstadoDeProyecto(registro.proyectoActivoId) || estadoPorDefecto();
}

function guardarEstado() {
  const registro = cargarRegistro();
  const id = registro.proyectoActivoId;
  if (id) {
    localStorage.setItem(prefijoProyecto(id), JSON.stringify(estado));
    const proyecto = registro.proyectos.find((p) => p.id === id);
    if (proyecto) proyecto.actualizado = Date.now();
    guardarRegistroDirecto(registro);
  }
  mostrarGuardado();
}

let temporizadorIndicadorGuardado;
function mostrarGuardado() {
  const el = document.getElementById("indicadorGuardado");
  if (!el) return;
  el.textContent = "💾 Guardando...";
  el.classList.add("guardando");
  clearTimeout(temporizadorIndicadorGuardado);
  temporizadorIndicadorGuardado = setTimeout(() => {
    el.textContent = "✓ Guardado";
    el.classList.remove("guardando");
  }, 500);
}

let estado = inicializarProyectos();
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
const panelPaginas = document.getElementById("panelPaginas");
const panelProyectos = document.getElementById("panelProyectos");

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
  if (!panelPaginas.classList.contains("oculto")) construirPanelPaginas();
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
  } else if (el.tipo === "mapa") {
    const img = document.createElement("img");
    img.src = construirURLMapa(el.lat, el.lon, el.estilo);
    img.draggable = false;
    img.alt = "Mapa de ubicación";
    wrapper.appendChild(img);
    const pin = document.createElement("span");
    pin.className = "pin-mapa";
    pin.textContent = "📍";
    wrapper.appendChild(pin);
    wrapper.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".handle-resize, .handle-borrar, .handle-formato")) return;
      iniciarArrastre(e, el, wrapper);
    });
  } else if (el.tipo === "bandera") {
    if (el.formato === "imagen") {
      const img = document.createElement("img");
      img.src = `https://flagcdn.com/w320/${el.codigoPais.toLowerCase()}.png`;
      img.draggable = false;
      img.alt = "Bandera";
      wrapper.appendChild(img);
    } else {
      const span = document.createElement("span");
      span.className = "emoji-bandera";
      span.textContent = codigoPaisABandera(el.codigoPais);
      wrapper.appendChild(span);
    }
    wrapper.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".handle-resize, .handle-borrar, .handle-formato")) return;
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

  if (el.tipo === "mapa" || el.tipo === "bandera") {
    const handleFormato = document.createElement("span");
    handleFormato.className = "handle-formato";
    handleFormato.textContent = "🔄";
    handleFormato.title = "Cambiar estilo";
    handleFormato.addEventListener("click", (e) => {
      e.stopPropagation();
      if (el.tipo === "mapa") {
        const i = ESTILOS_MAPA_LISTA.indexOf(el.estilo);
        el.estilo = ESTILOS_MAPA_LISTA[(i + 1) % ESTILOS_MAPA_LISTA.length];
      } else {
        el.formato = el.formato === "emoji" ? "imagen" : "emoji";
      }
      guardarEstado();
      render();
    });
    wrapper.appendChild(handleFormato);
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

/* ==========================================================
   VENTANA MODAL (reemplaza confirm()/alert() del navegador)
   ========================================================== */
const modalOverlay = document.getElementById("modalOverlay");
const modalTitulo = document.getElementById("modalTitulo");
const modalMensaje = document.getElementById("modalMensaje");
const modalInput = document.getElementById("modalInput");
const modalCasillasCont = document.getElementById("modalCasillas");
const modalOk = document.getElementById("modalOk");
const modalCancelar = document.getElementById("modalCancelar");

function abrirModal({ titulo, mensaje, conInput = false, valorInicial = "", casillas = null, textoOk = "Aceptar", textoCancelar = "Cancelar", peligro = false }) {
  return new Promise((resolve) => {
    modalTitulo.textContent = titulo;
    modalMensaje.textContent = mensaje;
    modalInput.value = valorInicial;
    modalInput.classList.toggle("oculto", !conInput);
    modalOk.textContent = textoOk;
    modalCancelar.textContent = textoCancelar;
    modalOk.classList.toggle("btn-peligro", peligro);
    modalOk.classList.toggle("btn-primario", !peligro);
    modalOverlay.classList.remove("oculto");
    if (conInput) setTimeout(() => { modalInput.focus(); modalInput.select(); }, 50);

    modalCasillasCont.innerHTML = "";
    if (casillas && casillas.length) {
      casillas.forEach((c) => {
        const fila = document.createElement("label");
        fila.className = "fila-casilla";
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.id = "modalCasilla-" + c.id;
        chk.checked = !!c.marcada;
        fila.appendChild(chk);
        fila.appendChild(document.createTextNode(c.etiqueta));
        modalCasillasCont.appendChild(fila);
      });
    }

    function limpiar() {
      modalOverlay.classList.add("oculto");
      modalOk.removeEventListener("click", onOk);
      modalCancelar.removeEventListener("click", onCancelar);
      modalOverlay.removeEventListener("click", onFondo);
      document.removeEventListener("keydown", onTecla);
    }
    function onOk() {
      limpiar();
      if (casillas && casillas.length) {
        const marcas = {};
        casillas.forEach((c) => {
          marcas[c.id] = document.getElementById("modalCasilla-" + c.id).checked;
        });
        resolve({ texto: conInput ? modalInput.value.trim() : null, marcas });
      } else {
        resolve(conInput ? modalInput.value.trim() : true);
      }
    }
    function onCancelar() {
      limpiar();
      resolve(casillas && casillas.length ? null : (conInput ? null : false));
    }
    function onFondo(e) {
      if (e.target === modalOverlay) onCancelar();
    }
    function onTecla(e) {
      if (e.key === "Escape") onCancelar();
      if (e.key === "Enter" && conInput && !(casillas && casillas.length)) onOk();
    }
    modalOk.addEventListener("click", onOk);
    modalCancelar.addEventListener("click", onCancelar);
    modalOverlay.addEventListener("click", onFondo);
    document.addEventListener("keydown", onTecla);
  });
}

/* ==========================================================
   SELECTOR DE ARCHIVOS COMPARTIDO
   (un único <input type="file"> reutilizable, en vez de crear
   uno nuevo cada vez — más confiable entre navegadores)
   ========================================================== */
const inputAuxiliar = document.getElementById("inputAuxiliar");
let callbackInputAuxiliar = null;

inputAuxiliar.addEventListener("change", async () => {
  const archivo = inputAuxiliar.files[0];
  const cb = callbackInputAuxiliar;
  callbackInputAuxiliar = null;
  inputAuxiliar.value = "";
  if (archivo && cb) await cb(archivo);
});

function pedirArchivoImagen(callback) {
  callbackInputAuxiliar = callback;
  inputAuxiliar.click();
}

/* ---------- SUBIR FOTOS (libres) ---------- */
const inputFoto = document.getElementById("inputFoto");
document.getElementById("btnFoto").addEventListener("click", () => inputFoto.click());

inputFoto.addEventListener("change", async (e) => {
  const archivos = Array.from(e.target.files);
  const hojaObj = hojaEnPosicion(posicion);
  let offset = 0;
  const nuevosPares = [];
  for (const archivo of archivos) {
    const dataUrl = await leerComoDataURL(archivo);
    const elemento = {
      tipo: "foto", vacio: false, src: dataUrl,
      x: 8 + offset, y: 8 + offset, w: 55, h: 55
    };
    hojaObj.elementos.push(elemento);
    nuevosPares.push({ archivo, elemento });
    offset = (offset + 5) % 25;
  }
  guardarEstado();
  render();
  inputFoto.value = "";

  for (const { archivo, elemento } of nuevosPares) {
    await sugerirUbicacionSiHay(archivo, elemento, hojaObj);
  }
});

function leerComoDataURL(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

function subirFotoParaSlot(el, hojaObj) {
  pedirArchivoImagen(async (archivo) => {
    el.src = await leerComoDataURL(archivo);
    el.vacio = false;
    guardarEstado();
    render();
    await sugerirUbicacionSiHay(archivo, el, hojaObj);
  });
}

/* ==========================================================
   UBICACIÓN DE LA FOTO (leer GPS del EXIF + convertir a lugar)
   ========================================================== */
function leerGPSDeArrayBuffer(buffer) {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null; // no es JPEG
    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 4) {
      const marcador = view.getUint16(offset);
      if (marcador === 0xffe1) {
        const exifLength = view.getUint16(offset + 2);
        const exifOffset = offset + 4;
        if (view.getUint32(exifOffset) !== 0x45786966) { // "Exif"
          offset += 2 + exifLength;
          continue;
        }
        const tiffOffset = exifOffset + 6;
        const little = view.getUint16(tiffOffset) === 0x4949;
        const u16 = (o) => view.getUint16(o, little);
        const u32 = (o) => view.getUint32(o, little);

        const ifd0Offset = tiffOffset + u32(tiffOffset + 4);
        const numEntradas = u16(ifd0Offset);
        let gpsIFDOffset = null;
        for (let i = 0; i < numEntradas; i++) {
          const entrada = ifd0Offset + 2 + i * 12;
          if (u16(entrada) === 0x8825) {
            gpsIFDOffset = tiffOffset + u32(entrada + 8);
          }
        }
        if (gpsIFDOffset === null) return null;

        const gpsEntradas = u16(gpsIFDOffset);
        const tags = {};
        for (let i = 0; i < gpsEntradas; i++) {
          const entrada = gpsIFDOffset + 2 + i * 12;
          const tag = u16(entrada);
          if (tag === 1 || tag === 3) {
            tags[tag] = String.fromCharCode(view.getUint8(entrada + 8));
          } else if (tag === 2 || tag === 4) {
            const datosOffset = tiffOffset + u32(entrada + 8);
            const valores = [];
            for (let j = 0; j < 3; j++) {
              const num = u32(datosOffset + j * 8);
              const den = u32(datosOffset + j * 8 + 4);
              valores.push(den === 0 ? 0 : num / den);
            }
            tags[tag] = valores;
          }
        }
        if (!tags[2] || !tags[4]) return null;
        const aDecimal = (arr) => arr[0] + arr[1] / 60 + arr[2] / 3600;
        let lat = aDecimal(tags[2]);
        let lon = aDecimal(tags[4]);
        if (tags[1] === "S") lat = -lat;
        if (tags[3] === "W") lon = -lon;
        if (!isFinite(lat) || !isFinite(lon)) return null;
        return { lat, lon };
      } else if ((marcador & 0xff00) !== 0xff00) {
        break;
      } else {
        offset += 2 + view.getUint16(offset + 2);
      }
    }
  } catch (e) { /* archivo sin EXIF válido: lo ignoramos */ }
  return null;
}

async function buscarLugarPorCoordenadas(lat, lon) {
  try {
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 5000);
    const resp = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`,
      { signal: controlador.signal }
    );
    clearTimeout(limite);
    if (!resp.ok) throw new Error("geocoding falló");
    const datos = await resp.json();
    const partes = [datos.locality || datos.city, datos.principalSubdivision, datos.countryName].filter(Boolean);
    const texto = partes.length ? partes.slice(0, 2).join(", ") : `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    return { texto, countryCode: datos.countryCode || null, countryName: datos.countryName || null };
  } catch (e) {
    return { texto: `${lat.toFixed(3)}, ${lon.toFixed(3)}`, countryCode: null, countryName: null };
  }
}

/* Varios estilos de mapa para elegir (todos gratuitos, sin necesidad de clave) */
const ESTILOS_MAPA = {
  estandar: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  topografico: (z, x, y) => `https://a.tile.opentopomap.org/${z}/${x}/${y}.png`,
  ciclismo: (z, x, y) => `https://a.tile-cyclosm.openstreetmap.fr/cyclosm/${z}/${x}/${y}.png`,
  humanitario: (z, x, y) => `https://tile-a.openstreetmap.fr/hot/${z}/${x}/${y}.png`
};
const ESTILOS_MAPA_LISTA = Object.keys(ESTILOS_MAPA);

function construirURLMapa(lat, lon, estilo) {
  const zoom = 14;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  const constructor = ESTILOS_MAPA[estilo] || ESTILOS_MAPA.estandar;
  return constructor(zoom, x, y);
}

/* Convierte un código de país (ISO "AR") en el emoji de su bandera */
function codigoPaisABandera(codigoPais) {
  if (!codigoPais || codigoPais.length !== 2) return "🏳️";
  return String.fromCodePoint(...codigoPais.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)));
}

async function sugerirUbicacionSiHay(archivo, elementoFoto, hojaObj) {
  if (!archivo || (archivo.type !== "image/jpeg" && archivo.type !== "image/jpg")) return;
  try {
    const buffer = await archivo.arrayBuffer();
    const gps = leerGPSDeArrayBuffer(buffer);
    if (!gps) return;
    const info = await buscarLugarPorCoordenadas(gps.lat, gps.lon);
    const respuesta = await abrirModal({
      titulo: "📍 Ubicación detectada",
      mensaje: "Esta foto tiene datos de dónde fue tomada. Elegí qué querés agregar a la página (después podés cambiar el estilo del mapa o la bandera tocando 🔄):",
      conInput: true,
      valorInicial: info.texto,
      casillas: [
        { id: "texto", etiqueta: "Agregar el nombre del lugar como texto", marcada: true },
        { id: "mapa", etiqueta: "Agregar un mini-mapa con la ubicación", marcada: false },
        { id: "bandera", etiqueta: info.countryCode ? `Agregar la bandera de ${info.countryName || "ese país"}` : "", marcada: false }
      ].filter((c) => c.etiqueta),
      textoOk: "Agregar a la página",
      textoCancelar: "No, gracias"
    });
    if (!respuesta) return;

    let yBase = clamp(elementoFoto.y + elementoFoto.h + 2, 0, 88);

    if (respuesta.marcas.texto) {
      hojaObj.elementos.push({
        tipo: "texto",
        x: clamp(elementoFoto.x, 0, 70), y: yBase,
        w: Math.max(elementoFoto.w, 30), h: 9, fontSize: 3.2,
        texto: "📍 " + respuesta.texto
      });
      yBase = clamp(yBase + 10, 0, 78);
    }

    if (respuesta.marcas.mapa) {
      hojaObj.elementos.push({
        tipo: "mapa", estilo: "estandar",
        x: clamp(elementoFoto.x, 0, 65), y: yBase,
        w: Math.max(Math.min(elementoFoto.w, 40), 25), h: 20,
        lat: gps.lat, lon: gps.lon
      });
      yBase = clamp(yBase + 22, 0, 78);
    }

    if (respuesta.marcas.bandera && info.countryCode) {
      hojaObj.elementos.push({
        tipo: "bandera", formato: "emoji", codigoPais: info.countryCode,
        x: clamp(elementoFoto.x, 0, 85), y: yBase, w: 12, h: 12
      });
    }

    if (respuesta.marcas.texto || respuesta.marcas.mapa || respuesta.marcas.bandera) {
      guardarEstado();
      render();
    }
  } catch (e) { /* si algo falla no interrumpimos al usuario */ }
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

/* ---------- PANELES: abrir uno solo a la vez ---------- */
function cerrarPaneles(excepto) {
  [panelDisenos, panelFondo, panelPaginas, panelProyectos].forEach((p) => {
    if (p !== excepto) p.classList.add("oculto");
  });
}

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
  cerrarPaneles(panelDisenos);
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
    sw.title = c;
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
    pedirArchivoImagen(async (archivo) => {
      const dataUrl = await leerComoDataURL(archivo);
      hojaObj.fondo = { tipo: "foto", valor: dataUrl };
      guardarEstado();
      render();
    });
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
  cerrarPaneles(panelFondo);
  const abrir = panelFondo.classList.contains("oculto");
  panelFondo.classList.toggle("oculto");
  if (abrir) construirPanelFondo();
});

/* ---------- REORDENAR PÁGINAS ---------- */
function construirPanelPaginas() {
  panelPaginas.innerHTML = "";

  if (estado.paginas.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "panel-vacio";
    vacio.textContent = "Todavía no hay páginas para reordenar (solo tapa y contratapa).";
    panelPaginas.appendChild(vacio);
    return;
  }

  const lista = document.createElement("div");
  lista.className = "lista-paginas";

  estado.paginas.forEach((p, i) => {
    const fila = document.createElement("div");
    fila.className = "fila-pagina" + (posicion === i + 1 ? " activa" : "");

    const miniatura = document.createElement("div");
    miniatura.className = "miniatura-pagina";
    aplicarFondo(miniatura, p.fondo);
    fila.appendChild(miniatura);

    const info = document.createElement("span");
    info.className = "info-pagina";
    info.textContent = `Página ${i + 1}`;
    fila.appendChild(info);

    const btnSubir = document.createElement("button");
    btnSubir.className = "btn btn-icono";
    btnSubir.textContent = "▲";
    btnSubir.title = "Mover antes";
    btnSubir.disabled = i === 0;
    btnSubir.addEventListener("click", () => moverPagina(i, i - 1));
    fila.appendChild(btnSubir);

    const btnBajar = document.createElement("button");
    btnBajar.className = "btn btn-icono";
    btnBajar.textContent = "▼";
    btnBajar.title = "Mover después";
    btnBajar.disabled = i === estado.paginas.length - 1;
    btnBajar.addEventListener("click", () => moverPagina(i, i + 1));
    fila.appendChild(btnBajar);

    const btnIr = document.createElement("button");
    btnIr.className = "btn";
    btnIr.textContent = "Ir a esta página";
    btnIr.addEventListener("click", () => {
      posicion = i + 1;
      render();
    });
    fila.appendChild(btnIr);

    lista.appendChild(fila);
  });

  panelPaginas.appendChild(lista);
}

function moverPagina(desde, hacia) {
  if (hacia < 0 || hacia >= estado.paginas.length) return;
  const paginaActualEsLaQueSeMueve = posicion - 1 === desde;
  const [pagina] = estado.paginas.splice(desde, 1);
  estado.paginas.splice(hacia, 0, pagina);
  if (paginaActualEsLaQueSeMueve) posicion = hacia + 1;
  guardarEstado();
  construirPanelPaginas();
  render();
}

document.getElementById("btnReordenar").addEventListener("click", () => {
  cerrarPaneles(panelPaginas);
  const abrir = panelPaginas.classList.contains("oculto");
  panelPaginas.classList.toggle("oculto");
  if (abrir) construirPanelPaginas();
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

btnPaginaBorrar.addEventListener("click", async () => {
  if (tipoEnPosicion(posicion) !== "pagina") return;
  const confirmado = await abrirModal({
    titulo: "Borrar página",
    mensaje: "¿Borrar esta página y todo su contenido? Esta acción no se puede deshacer.",
    textoOk: "Borrar",
    textoCancelar: "Cancelar",
    peligro: true
  });
  if (!confirmado) return;
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
document.getElementById("btnVaciar").addEventListener("click", async () => {
  const confirmado = await abrirModal({
    titulo: "Empezar de nuevo",
    mensaje: "Esto borra todas las fotos y textos guardados en este navegador. Esta acción no se puede deshacer.",
    textoOk: "Borrar todo",
    textoCancelar: "Cancelar",
    peligro: true
  });
  if (!confirmado) return;
  estado = estadoPorDefecto();
  posicion = 0;
  guardarEstado();
  render();
});

/* ---------- MIS PROYECTOS ---------- */
function formatearFecha(ts) {
  const d = new Date(ts);
  const fecha = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} ${hora}`;
}

function actualizarNombreProyectoActivo() {
  const registro = cargarRegistro();
  const activo = registro.proyectos.find((p) => p.id === registro.proyectoActivoId);
  const el = document.getElementById("nombreProyectoActivo");
  if (el) el.textContent = activo ? activo.nombre : "Mi libro de fotos";
}

function construirPanelProyectos() {
  const registro = cargarRegistro();
  panelProyectos.innerHTML = "";

  const btnNuevo = document.createElement("button");
  btnNuevo.className = "btn btn-primario";
  btnNuevo.textContent = "➕ Nuevo proyecto";
  btnNuevo.addEventListener("click", async () => {
    const nombre = await abrirModal({
      titulo: "Nuevo proyecto",
      mensaje: "¿Cómo querés llamar a este libro?",
      conInput: true,
      valorInicial: "Mi nuevo libro",
      textoOk: "Crear"
    });
    if (!nombre) return;
    const id = crearProyectoNuevo(nombre, estadoPorDefecto());
    cambiarProyecto(id);
  });
  panelProyectos.appendChild(btnNuevo);

  const lista = document.createElement("div");
  lista.className = "lista-proyectos";

  registro.proyectos.slice().sort((a, b) => b.actualizado - a.actualizado).forEach((p) => {
    const esActivo = p.id === registro.proyectoActivoId;
    const fila = document.createElement("div");
    fila.className = "fila-proyecto" + (esActivo ? " activa" : "");

    const info = document.createElement("div");
    info.className = "info-proyecto";
    const nombreEl = document.createElement("strong");
    nombreEl.textContent = p.nombre;
    const fechaEl = document.createElement("span");
    fechaEl.className = "fecha-proyecto";
    fechaEl.textContent = "Editado " + formatearFecha(p.actualizado);
    info.appendChild(nombreEl);
    info.appendChild(fechaEl);
    fila.appendChild(info);

    if (esActivo) {
      const chip = document.createElement("span");
      chip.className = "chip-activo";
      chip.textContent = "Editando ahora";
      fila.appendChild(chip);
    } else {
      const btnAbrir = document.createElement("button");
      btnAbrir.className = "btn";
      btnAbrir.textContent = "Abrir";
      btnAbrir.addEventListener("click", () => cambiarProyecto(p.id));
      fila.appendChild(btnAbrir);
    }

    const btnRenombrar = document.createElement("button");
    btnRenombrar.className = "btn btn-icono";
    btnRenombrar.textContent = "✏️";
    btnRenombrar.title = "Renombrar";
    btnRenombrar.addEventListener("click", async () => {
      const nuevoNombre = await abrirModal({
        titulo: "Renombrar proyecto",
        mensaje: "Nuevo nombre para este libro:",
        conInput: true,
        valorInicial: p.nombre,
        textoOk: "Guardar"
      });
      if (!nuevoNombre) return;
      const reg2 = cargarRegistro();
      const proy = reg2.proyectos.find((x) => x.id === p.id);
      if (proy) { proy.nombre = nuevoNombre; guardarRegistroDirecto(reg2); }
      construirPanelProyectos();
      actualizarNombreProyectoActivo();
    });
    fila.appendChild(btnRenombrar);

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "btn btn-icono btn-peligro";
    btnEliminar.textContent = "🗑";
    btnEliminar.title = "Eliminar proyecto";
    btnEliminar.addEventListener("click", async () => {
      const ok = await abrirModal({
        titulo: "Eliminar proyecto",
        mensaje: `¿Eliminar "${p.nombre}" para siempre? Esta acción no se puede deshacer.`,
        textoOk: "Eliminar",
        peligro: true
      });
      if (!ok) return;
      eliminarProyecto(p.id);
    });
    fila.appendChild(btnEliminar);

    lista.appendChild(fila);
  });

  panelProyectos.appendChild(lista);
}

function cambiarProyecto(id) {
  const nuevoEstado = leerEstadoDeProyecto(id);
  if (!nuevoEstado) return;
  const registro = cargarRegistro();
  registro.proyectoActivoId = id;
  guardarRegistroDirecto(registro);
  estado = nuevoEstado;
  posicion = 0;
  actualizarNombreProyectoActivo();
  render();
  panelProyectos.classList.add("oculto");
}

function eliminarProyecto(id) {
  let registro = cargarRegistro();
  registro.proyectos = registro.proyectos.filter((p) => p.id !== id);
  localStorage.removeItem(prefijoProyecto(id));

  if (registro.proyectoActivoId === id) {
    if (registro.proyectos.length === 0) {
      const nuevoId = crearProyectoNuevo("Mi libro de fotos", estadoPorDefecto());
      registro = cargarRegistro();
      registro.proyectoActivoId = nuevoId;
    } else {
      registro.proyectoActivoId = registro.proyectos[0].id;
    }
  }
  guardarRegistroDirecto(registro);

  estado = leerEstadoDeProyecto(registro.proyectoActivoId) || estadoPorDefecto();
  posicion = 0;
  actualizarNombreProyectoActivo();
  construirPanelProyectos();
  render();
}

document.getElementById("btnProyectos").addEventListener("click", () => {
  cerrarPaneles(panelProyectos);
  const abrir = panelProyectos.classList.contains("oculto");
  panelProyectos.classList.toggle("oculto");
  if (abrir) construirPanelProyectos();
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
actualizarNombreProyectoActivo();
render();
