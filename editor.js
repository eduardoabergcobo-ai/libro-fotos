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
    configuracion: { anchoIn: 10, altoIn: 8 },
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
  if (viejo && viejo.tapa && viejo.contratapa && Array.isArray(viejo.paginas)) {
    if (!viejo.configuracion) viejo.configuracion = { anchoIn: 10, altoIn: 8 };
    return viejo;
  }
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

/* ---------- GUARDADO + HISTORIAL (deshacer / rehacer) ---------- */
const LIMITE_HISTORIAL = 12;
let pilaDeshacer = [];
let pilaRehacer = [];

function persistirActivo() {
  const registro = cargarRegistro();
  const id = registro.proyectoActivoId;
  if (id) {
    localStorage.setItem(prefijoProyecto(id), ultimoEstadoTexto);
    const proyecto = registro.proyectos.find((p) => p.id === id);
    if (proyecto) proyecto.actualizado = Date.now();
    guardarRegistroDirecto(registro);
  }
  mostrarGuardado();
}

function guardarEstado() {
  const nuevoTexto = JSON.stringify(estado);
  if (nuevoTexto !== ultimoEstadoTexto) {
    pilaDeshacer.push(ultimoEstadoTexto);
    if (pilaDeshacer.length > LIMITE_HISTORIAL) pilaDeshacer.shift();
    pilaRehacer = [];
  }
  ultimoEstadoTexto = nuevoTexto;
  persistirActivo();
  actualizarBotonesHistorial();
}

function reiniciarHistorial() {
  pilaDeshacer = [];
  pilaRehacer = [];
  ultimoEstadoTexto = JSON.stringify(estado);
  actualizarBotonesHistorial();
}

function deshacer() {
  if (!pilaDeshacer.length) return;
  pilaRehacer.push(ultimoEstadoTexto);
  const anterior = pilaDeshacer.pop();
  estado = JSON.parse(anterior);
  ultimoEstadoTexto = anterior;
  posicion = Math.max(0, Math.min(posicion, totalPosiciones() - 1));
  persistirActivo();
  render();
  actualizarBotonesHistorial();
}

function rehacer() {
  if (!pilaRehacer.length) return;
  pilaDeshacer.push(ultimoEstadoTexto);
  const siguiente = pilaRehacer.pop();
  estado = JSON.parse(siguiente);
  ultimoEstadoTexto = siguiente;
  posicion = Math.max(0, Math.min(posicion, totalPosiciones() - 1));
  persistirActivo();
  render();
  actualizarBotonesHistorial();
}

function actualizarBotonesHistorial() {
  const btnD = document.getElementById("btnDeshacer");
  const btnR = document.getElementById("btnRehacer");
  if (btnD) btnD.disabled = pilaDeshacer.length === 0;
  if (btnR) btnR.disabled = pilaRehacer.length === 0;
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
let ultimoEstadoTexto = JSON.stringify(estado);
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
const hojaContenedor = document.getElementById("hojaContenedor");
const indicadorPagina = document.getElementById("indicadorPagina");
const btnPaginaPrev = document.getElementById("btnPaginaPrev");
const btnPaginaNext = document.getElementById("btnPaginaNext");
const btnPaginaBorrar = document.getElementById("btnPaginaBorrar");
const panelLateral = document.getElementById("panelLateral");
const panelLateralTitulo = document.getElementById("panelLateralTitulo");
const panelLateralContenido = document.getElementById("panelLateralContenido");

/* ---------- TAMAÑO Y ORIENTACIÓN DEL LIBRO ---------- */
function aplicarConfiguracionLibro() {
  const conf = estado.configuracion || { anchoIn: 10, altoIn: 8 };
  hoja.style.aspectRatio = `${conf.anchoIn} / ${conf.altoIn}`;
}

/* ---------- RENDER ---------- */
function render() {
  aplicarConfiguracionLibro();
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

  if (panelActivo === "fondo") construirPanelFondo();
  if (panelActivo === "paginas") construirPanelPaginas();

  if (elementoTextoActivo && hojaObj.elementos.includes(elementoTextoActivo)) {
    mostrarBarraFormato(elementoTextoActivo);
  } else {
    ocultarBarraFormatoSiCorresponde();
  }
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
        if (e.target.closest(".handle-resize, .handle-borrar, .handle-duplicar, .grip")) return;
        subirFotoParaSlot(el, hojaObj);
      });
    } else {
      const img = document.createElement("img");
      img.src = el.src;
      img.draggable = false;
      img.style.objectPosition = `${el.posX ?? 50}% ${el.posY ?? 50}%`;
      wrapper.appendChild(img);
    }
    wrapper.addEventListener("pointerdown", (e) => {
      if (el.vacio) return;
      if (e.target.closest(".handle-resize, .handle-borrar, .handle-duplicar, .handle-encuadre, .popover-encuadre")) return;
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
      if (e.target.closest(".handle-resize, .handle-borrar, .handle-formato, .handle-duplicar")) return;
      iniciarArrastre(e, el, wrapper);
    });
  } else if (el.tipo === "qr") {
    const img = document.createElement("img");
    img.src = construirURLQR(el.url);
    img.draggable = false;
    img.alt = "Código QR";
    wrapper.appendChild(img);
    wrapper.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".handle-resize, .handle-borrar, .handle-duplicar")) return;
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
      if (e.target.closest(".handle-resize, .handle-borrar, .handle-formato, .handle-duplicar")) return;
      iniciarArrastre(e, el, wrapper);
    });
  } else {
    const contenido = document.createElement("div");
    contenido.className = "contenido";
    contenido.contentEditable = "true";
    contenido.spellcheck = false;
    contenido.style.fontSize = el.fontSize + "cqw";
    contenido.style.fontFamily = MAPA_FUENTES[el.fuente || "georgia"];
    contenido.style.justifyContent = MAPA_ALINEACION[el.alineacion || "centro"];
    contenido.style.textAlign = el.alineacion === "izquierda" ? "left" : el.alineacion === "derecha" ? "right" : "center";
    contenido.textContent = el.texto;
    contenido.addEventListener("pointerdown", (e) => e.stopPropagation());
    contenido.addEventListener("focus", () => mostrarBarraFormato(el));
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
    handleBorrar.title = "Borrar";
    handleBorrar.addEventListener("click", (e) => {
      e.stopPropagation();
      hojaObj.elementos.splice(idx, 1);
      guardarEstado();
      render();
    });
    wrapper.appendChild(handleBorrar);

    const handleDuplicar = document.createElement("span");
    handleDuplicar.className = "handle-duplicar";
    handleDuplicar.textContent = "⧉";
    handleDuplicar.title = "Duplicar";
    handleDuplicar.addEventListener("click", (e) => {
      e.stopPropagation();
      const copia = JSON.parse(JSON.stringify(el));
      copia.x = clamp(el.x + 4, 0, 100 - el.w);
      copia.y = clamp(el.y + 4, 0, 100 - el.h);
      hojaObj.elementos.push(copia);
      guardarEstado();
      render();
    });
    wrapper.appendChild(handleDuplicar);
  }

  if (el.tipo === "foto" && !el.vacio) {
    const handleEncuadre = document.createElement("span");
    handleEncuadre.className = "handle-encuadre";
    handleEncuadre.textContent = "🎯";
    handleEncuadre.title = "Ajustar encuadre";
    handleEncuadre.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirPopoverEncuadre(el, wrapper);
    });
    wrapper.appendChild(handleEncuadre);
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

/* ---------- ENCUADRE DE FOTO (elegir qué parte de la foto se ve) ---------- */
function cerrarPopoversEncuadre() {
  document.querySelectorAll(".popover-encuadre").forEach((p) => p.remove());
}

function abrirPopoverEncuadre(el, wrapper) {
  const yaAbierto = wrapper.querySelector(".popover-encuadre");
  cerrarPopoversEncuadre();
  if (yaAbierto) return;

  const pop = document.createElement("div");
  pop.className = "popover-encuadre";

  const filaX = document.createElement("label");
  filaX.textContent = "Horizontal";
  const rangoX = document.createElement("input");
  rangoX.type = "range"; rangoX.min = 0; rangoX.max = 100; rangoX.value = el.posX ?? 50;
  filaX.appendChild(rangoX);

  const filaY = document.createElement("label");
  filaY.textContent = "Vertical";
  const rangoY = document.createElement("input");
  rangoY.type = "range"; rangoY.min = 0; rangoY.max = 100; rangoY.value = el.posY ?? 50;
  filaY.appendChild(rangoY);

  pop.appendChild(filaX);
  pop.appendChild(filaY);
  wrapper.appendChild(pop);

  function actualizar() {
    el.posX = Number(rangoX.value);
    el.posY = Number(rangoY.value);
    const img = wrapper.querySelector("img");
    if (img) img.style.objectPosition = `${el.posX}% ${el.posY}%`;
  }
  rangoX.addEventListener("input", actualizar);
  rangoY.addEventListener("input", actualizar);
  rangoX.addEventListener("change", guardarEstado);
  rangoY.addEventListener("change", guardarEstado);

  pop.addEventListener("pointerdown", (e) => e.stopPropagation());
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".popover-encuadre, .handle-encuadre")) cerrarPopoversEncuadre();
});

/* ==========================================================
   FORMATO DE TEXTO (tipografía y tamaño)
   ========================================================== */
const MAPA_FUENTES = {
  georgia: "'Georgia', serif",
  clasica: "'Times New Roman', serif",
  moderna: "'Montserrat', 'Segoe UI', sans-serif",
  maquina: "'Courier New', monospace",
  titular: "'Playfair Display', Georgia, serif",
  manuscrita: "'Caveat', cursive"
};
const OPCIONES_FUENTE = [
  { id: "georgia", etiqueta: "Elegante (Georgia)" },
  { id: "clasica", etiqueta: "Clásica (Times)" },
  { id: "moderna", etiqueta: "Moderna (Montserrat)" },
  { id: "maquina", etiqueta: "Máquina de escribir" },
  { id: "titular", etiqueta: "Título (Playfair)" },
  { id: "manuscrita", etiqueta: "Manuscrita (Caveat)" }
];
const MAPA_ALINEACION = { izquierda: "flex-start", centro: "center", derecha: "flex-end" };

const barraFormato = document.getElementById("barraFormato");
const selectFuente = document.getElementById("selectFuente");
const indicadorTamano = document.getElementById("indicadorTamano");
OPCIONES_FUENTE.forEach((f) => {
  const opt = document.createElement("option");
  opt.value = f.id;
  opt.textContent = f.etiqueta;
  selectFuente.appendChild(opt);
});

let elementoTextoActivo = null;

const botonesAlineacion = {
  izquierda: document.getElementById("btnAlinearIzq"),
  centro: document.getElementById("btnAlinearCentro"),
  derecha: document.getElementById("btnAlinearDer")
};

function mostrarBarraFormato(el) {
  elementoTextoActivo = el;
  selectFuente.value = el.fuente || "georgia";
  indicadorTamano.textContent = (el.fontSize || 5).toFixed(1).replace(/\.0$/, "");
  Object.entries(botonesAlineacion).forEach(([nombre, btn]) => {
    btn.classList.toggle("activo", (el.alineacion || "centro") === nombre);
  });
  barraFormato.classList.remove("oculto");
}

function cambiarAlineacion(valor) {
  if (!elementoTextoActivo) return;
  elementoTextoActivo.alineacion = valor;
  guardarEstado();
  render();
}
botonesAlineacion.izquierda.addEventListener("click", () => cambiarAlineacion("izquierda"));
botonesAlineacion.centro.addEventListener("click", () => cambiarAlineacion("centro"));
botonesAlineacion.derecha.addEventListener("click", () => cambiarAlineacion("derecha"));

function ocultarBarraFormatoSiCorresponde() {
  const hojaObj = hojaEnPosicion(posicion);
  if (elementoTextoActivo && hojaObj.elementos.includes(elementoTextoActivo)) return;
  elementoTextoActivo = null;
  barraFormato.classList.add("oculto");
}

selectFuente.addEventListener("change", () => {
  if (!elementoTextoActivo) return;
  elementoTextoActivo.fuente = selectFuente.value;
  guardarEstado();
  render();
});

function cambiarTamanoTexto(delta) {
  if (!elementoTextoActivo) return;
  elementoTextoActivo.fontSize = clamp((elementoTextoActivo.fontSize || 5) + delta, 1.5, 16);
  guardarEstado();
  render();
}
document.getElementById("btnTamanoMas").addEventListener("click", () => cambiarTamanoTexto(0.5));
document.getElementById("btnTamanoMenos").addEventListener("click", () => cambiarTamanoTexto(-0.5));

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
    modalOk.classList.toggle("boton-peligro", peligro);
    modalOk.classList.toggle("boton-primario", !peligro);
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
document.getElementById("railFoto").addEventListener("click", () => inputFoto.click());

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
   MAPAS Y BANDERAS (helpers compartidos)
   ========================================================== */
const ESTILOS_MAPA = {
  estandar: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  topografico: (z, x, y) => `https://a.tile.opentopomap.org/${z}/${x}/${y}.png`,
  ciclismo: (z, x, y) => `https://a.tile-cyclosm.openstreetmap.fr/cyclosm/${z}/${x}/${y}.png`,
  humanitario: (z, x, y) => `https://tile-a.openstreetmap.fr/hot/${z}/${x}/${y}.png`
};
const ESTILOS_MAPA_LISTA = Object.keys(ESTILOS_MAPA);
const NOMBRES_ESTILOS_MAPA = {
  estandar: "Estándar", topografico: "Topográfico", ciclismo: "Ilustrado", humanitario: "Humanitario"
};

function construirURLMapa(lat, lon, estilo) {
  const zoom = 14;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  const constructor = ESTILOS_MAPA[estilo] || ESTILOS_MAPA.estandar;
  return constructor(zoom, x, y);
}

function codigoPaisABandera(codigoPais) {
  if (!codigoPais || codigoPais.length !== 2) return "🏳️";
  return String.fromCodePoint(...codigoPais.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)));
}

function construirURLQR(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

/* ---------- UBICACIÓN AUTOMÁTICA (GPS del EXIF de la foto) ---------- */
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

async function sugerirUbicacionSiHay(archivo, elementoFoto, hojaObj) {
  if (!archivo || (archivo.type !== "image/jpeg" && archivo.type !== "image/jpg")) return;
  try {
    const buffer = await archivo.arrayBuffer();
    const gps = leerGPSDeArrayBuffer(buffer);
    if (!gps) return;
    const info = await buscarLugarPorCoordenadas(gps.lat, gps.lon);
    const respuesta = await abrirModal({
      titulo: "📍 Ubicación detectada",
      mensaje: "Esta foto tiene datos de dónde fue tomada. Elegí qué querés agregar (después podés cambiar el estilo tocando 🔄):",
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
    agregarElementosDeUbicacion(hojaObj, respuesta.texto, gps.lat, gps.lon, info.countryCode, {
      texto: respuesta.marcas.texto, mapa: respuesta.marcas.mapa, bandera: respuesta.marcas.bandera
    }, { x: elementoFoto.x, y: elementoFoto.y + elementoFoto.h + 2, w: elementoFoto.w });
  } catch (e) { /* si algo falla no interrumpimos al usuario */ }
}

/* Inserta texto / mapa / bandera de una ubicación dada, en cascada debajo de un punto de partida */
function agregarElementosDeUbicacion(hojaObj, textoLugar, lat, lon, countryCode, cuales, base) {
  let yBase = clamp(base.y, 0, 88);
  const anchoBase = base.w || 40;
  let algo = false;

  if (cuales.texto) {
    hojaObj.elementos.push({
      tipo: "texto",
      x: clamp(base.x, 0, 70), y: yBase,
      w: Math.max(anchoBase, 30), h: 9, fontSize: 3.2,
      texto: "📍 " + textoLugar
    });
    yBase = clamp(yBase + 10, 0, 78);
    algo = true;
  }
  if (cuales.mapa) {
    hojaObj.elementos.push({
      tipo: "mapa", estilo: "estandar",
      x: clamp(base.x, 0, 65), y: yBase,
      w: Math.max(Math.min(anchoBase, 40), 25), h: 20,
      lat, lon
    });
    yBase = clamp(yBase + 22, 0, 78);
    algo = true;
  }
  if (cuales.bandera && countryCode) {
    hojaObj.elementos.push({
      tipo: "bandera", formato: "emoji", codigoPais: countryCode,
      x: clamp(base.x, 0, 85), y: yBase, w: 12, h: 12
    });
    algo = true;
  }
  if (algo) {
    guardarEstado();
    render();
  }
}

/* ---------- AGREGAR TEXTO (rail) ---------- */
document.getElementById("railTexto").addEventListener("click", () => {
  hojaEnPosicion(posicion).elementos.push({
    tipo: "texto", x: 15, y: 15, w: 40, h: 20, fontSize: 5,
    texto: "Escribí acá tu texto"
  });
  guardarEstado();
  render();
});

/* ==========================================================
   PANEL LATERAL (uno solo, cambia de contenido según el rail)
   ========================================================== */
let panelActivo = null;

function abrirPanel(nombre, titulo, construir) {
  panelActivo = nombre;
  panelLateralTitulo.textContent = titulo;
  construir();
  panelLateral.classList.remove("oculto");
  actualizarRailActivo();
}

function cerrarPanel() {
  panelActivo = null;
  panelLateral.classList.add("oculto");
  actualizarRailActivo();
}

function actualizarRailActivo() {
  document.querySelectorAll(".rail-boton[data-panel]").forEach((b) => {
    b.classList.toggle("activo", b.dataset.panel === panelActivo);
  });
}

const DEFINICIONES_PANEL = {
  disenos: { titulo: "Diseños con varias fotos", construir: construirPanelDisenosUI },
  fondo: { titulo: "Fondo de la página", construir: construirPanelFondo },
  ubicacion: { titulo: "Mapa y bandera de un lugar", construir: construirPanelUbicacion },
  qr: { titulo: "Código QR (video o link)", construir: construirPanelQR },
  tamano: { titulo: "Tamaño y orientación", construir: construirPanelTamano },
  paginas: { titulo: "Tapa, contratapa y páginas", construir: construirPanelPaginas }
};

document.querySelectorAll(".rail-boton[data-panel]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const nombre = boton.dataset.panel;
    if (panelActivo === nombre) { cerrarPanel(); return; }
    const def = DEFINICIONES_PANEL[nombre];
    abrirPanel(nombre, def.titulo, def.construir);
  });
});

document.getElementById("btnCerrarPanel").addEventListener("click", cerrarPanel);

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

/* ---------- DISEÑOS PERSONALIZADOS (guardar el acomodo de fotos como plantilla propia) ---------- */
const CLAVE_DISENOS_PERSONALIZADOS = "libroFotosDisenosPersonalizados_v1";

function cargarDisenosPersonalizados() {
  try {
    const crudo = localStorage.getItem(CLAVE_DISENOS_PERSONALIZADOS);
    if (crudo) {
      const d = JSON.parse(crudo);
      if (Array.isArray(d.presets)) return d;
    }
  } catch (e) { /* datos corruptos: empezamos de nuevo */ }
  return { presets: [], defaultId: null };
}
function guardarDisenosPersonalizados(d) {
  localStorage.setItem(CLAVE_DISENOS_PERSONALIZADOS, JSON.stringify(d));
}

function hojaNuevaConPredeterminado() {
  const d = cargarDisenosPersonalizados();
  const preset = d.presets.find((p) => p.id === d.defaultId);
  if (!preset) return hojaVacia();
  return {
    fondo: { tipo: "color", valor: "#fffdf8" },
    elementos: preset.celdas.map((c) => ({ tipo: "foto", vacio: true, x: c.x, y: c.y, w: c.w, h: c.h }))
  };
}

function construirCajaMini(celdas) {
  const caja = document.createElement("div");
  caja.className = "caja-mini";
  celdas.forEach((c) => {
    const r = document.createElement("span");
    r.style.left = c.x + "%";
    r.style.top = c.y + "%";
    r.style.width = c.w + "%";
    r.style.height = c.h + "%";
    caja.appendChild(r);
  });
  return caja;
}

function construirPanelDisenosUI() {
  panelLateralContenido.innerHTML = "";

  const btnGuardar = document.createElement("button");
  btnGuardar.className = "boton";
  btnGuardar.style.width = "100%";
  btnGuardar.style.justifyContent = "center";
  btnGuardar.style.marginBottom = "14px";
  btnGuardar.textContent = "💾 Guardar el diseño de esta página";
  btnGuardar.addEventListener("click", guardarDisenoActualComoPersonalizado);
  panelLateralContenido.appendChild(btnGuardar);

  const rejilla = document.createElement("div");
  rejilla.className = "rejilla-disenos";
  DISENOS.forEach((d) => {
    const boton = document.createElement("button");
    boton.className = "miniatura-diseno";
    boton.title = "Aplicar este diseño a la página actual";
    boton.appendChild(construirCajaMini(d.celdas));
    boton.addEventListener("click", () => {
      aplicarDiseno(d);
      cerrarPanel();
    });
    rejilla.appendChild(boton);
  });
  panelLateralContenido.appendChild(rejilla);

  const datosPersonalizados = cargarDisenosPersonalizados();
  if (datosPersonalizados.presets.length) {
    const separador = document.createElement("div");
    separador.className = "separador-panel";
    panelLateralContenido.appendChild(separador);

    const subtitulo = document.createElement("p");
    subtitulo.className = "panel-vacio";
    subtitulo.style.textAlign = "left";
    subtitulo.style.margin = "0 0 10px";
    subtitulo.textContent = "Tus diseños — la ⭐ se usa automáticamente en las páginas nuevas.";
    panelLateralContenido.appendChild(subtitulo);

    datosPersonalizados.presets.forEach((preset) => {
      const fila = document.createElement("div");
      fila.className = "fila-diseno-personalizado";

      const miniBoton = document.createElement("button");
      miniBoton.className = "miniatura-diseno";
      miniBoton.title = "Aplicar este diseño a la página actual";
      miniBoton.appendChild(construirCajaMini(preset.celdas));
      miniBoton.addEventListener("click", () => {
        aplicarDiseno(preset);
        cerrarPanel();
      });
      fila.appendChild(miniBoton);

      const nombre = document.createElement("span");
      nombre.className = "nombre-diseno";
      nombre.textContent = preset.nombre;
      fila.appendChild(nombre);

      const btnEstrella = document.createElement("button");
      btnEstrella.className = "boton-estrella" + (datosPersonalizados.defaultId === preset.id ? " activa" : "");
      btnEstrella.title = "Usar como diseño predeterminado para páginas nuevas";
      btnEstrella.textContent = datosPersonalizados.defaultId === preset.id ? "⭐" : "☆";
      btnEstrella.addEventListener("click", () => {
        const d2 = cargarDisenosPersonalizados();
        d2.defaultId = d2.defaultId === preset.id ? null : preset.id;
        guardarDisenosPersonalizados(d2);
        construirPanelDisenosUI();
      });
      fila.appendChild(btnEstrella);

      const btnBorrar = document.createElement("button");
      btnBorrar.className = "boton-estrella";
      btnBorrar.title = "Eliminar este diseño";
      btnBorrar.textContent = "🗑";
      btnBorrar.addEventListener("click", async () => {
        const ok = await abrirModal({
          titulo: "Eliminar diseño",
          mensaje: `¿Eliminar el diseño "${preset.nombre}"? Esto no borra las fotos que ya usaste, solo la plantilla.`,
          textoOk: "Eliminar",
          peligro: true
        });
        if (!ok) return;
        const d3 = cargarDisenosPersonalizados();
        d3.presets = d3.presets.filter((p) => p.id !== preset.id);
        if (d3.defaultId === preset.id) d3.defaultId = null;
        guardarDisenosPersonalizados(d3);
        construirPanelDisenosUI();
      });
      fila.appendChild(btnBorrar);

      panelLateralContenido.appendChild(fila);
    });
  }
}

async function guardarDisenoActualComoPersonalizado() {
  const hojaObj = hojaEnPosicion(posicion);
  const fotos = hojaObj.elementos.filter((e) => e.tipo === "foto");
  if (!fotos.length) {
    await abrirModal({
      titulo: "Sin fotos en esta página",
      mensaje: "Para guardar un diseño primero acomodá una o más fotos en la página actual.",
      textoOk: "Entendido",
      textoCancelar: "Cerrar"
    });
    return;
  }
  const nombre = await abrirModal({
    titulo: "Guardar diseño",
    mensaje: "Ponele un nombre a este acomodo de fotos para volver a usarlo cuando quieras.",
    conInput: true,
    valorInicial: "Mi diseño",
    textoOk: "Guardar"
  });
  if (!nombre) return;
  const celdas = fotos.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h }));
  const d = cargarDisenosPersonalizados();
  d.presets.push({ id: generarId(), nombre, celdas });
  guardarDisenosPersonalizados(d);
  construirPanelDisenosUI();
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

/* ---------- FONDO (color o foto) ---------- */
const COLORES_FONDO = [
  "#2b1d14", "#fffdf8", "#1d2b3a", "#1d3a24", "#3a1d24",
  "#ffffff", "#111111", "#f5dde0", "#dbe9f5", "#d4af37"
];

function construirPanelFondo() {
  panelLateralContenido.innerHTML = "";
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
  panelLateralContenido.appendChild(fila);

  const filaAcciones = document.createElement("div");
  filaAcciones.className = "fila-acciones-fondo";

  const labelColor = document.createElement("label");
  labelColor.className = "boton";
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
  btnFotoFondo.className = "boton";
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
    btnQuitar.className = "boton boton-peligro";
    btnQuitar.textContent = "Quitar foto de fondo";
    btnQuitar.addEventListener("click", () => {
      hojaObj.fondo = { tipo: "color", valor: "#fffdf8" };
      guardarEstado();
      render();
    });
    filaAcciones.appendChild(btnQuitar);
  }

  panelLateralContenido.appendChild(filaAcciones);
}

/* ---------- UBICACIÓN MANUAL (buscar cualquier lugar) ---------- */
async function buscarLugares(consulta) {
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(consulta)}&format=json&addressdetails=1&limit=5&accept-language=es`
  );
  if (!resp.ok) throw new Error("búsqueda falló");
  return resp.json();
}

function construirPanelUbicacion() {
  panelLateralContenido.innerHTML = "";

  const info = document.createElement("p");
  info.className = "panel-vacio";
  info.style.margin = "0 0 12px";
  info.textContent = "Buscá cualquier lugar y agregá su nombre, un mini-mapa y/o su bandera a la página actual.";
  panelLateralContenido.appendChild(info);

  const campo = document.createElement("div");
  campo.className = "campo-busqueda";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ej: Mar del Plata, Argentina";
  const btnBuscar = document.createElement("button");
  btnBuscar.className = "boton boton-primario";
  btnBuscar.textContent = "Buscar";
  campo.appendChild(input);
  campo.appendChild(btnBuscar);
  panelLateralContenido.appendChild(campo);

  const resultados = document.createElement("div");
  resultados.className = "resultados-busqueda";
  panelLateralContenido.appendChild(resultados);

  let lugarSeleccionado = null;

  const zonaAgregar = document.createElement("div");
  zonaAgregar.className = "oculto";
  const casillasCont = document.createElement("div");
  casillasCont.className = "modal-casillas";
  ["texto", "mapa", "bandera"].forEach((id, i) => {
    const etiquetas = {
      texto: "Agregar el nombre del lugar como texto",
      mapa: "Agregar un mini-mapa con la ubicación",
      bandera: "Agregar la bandera del país"
    };
    const fila = document.createElement("label");
    fila.className = "fila-casilla";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.id = "ubicCasilla-" + id;
    chk.checked = i === 0;
    fila.appendChild(chk);
    fila.appendChild(document.createTextNode(etiquetas[id]));
    casillasCont.appendChild(fila);
  });
  zonaAgregar.appendChild(casillasCont);

  const btnAgregar = document.createElement("button");
  btnAgregar.className = "boton boton-primario";
  btnAgregar.style.width = "100%";
  btnAgregar.style.justifyContent = "center";
  btnAgregar.textContent = "Agregar a la página";
  btnAgregar.addEventListener("click", () => {
    if (!lugarSeleccionado) return;
    const hojaObj = hojaEnPosicion(posicion);
    agregarElementosDeUbicacion(
      hojaObj,
      lugarSeleccionado.nombre,
      lugarSeleccionado.lat,
      lugarSeleccionado.lon,
      lugarSeleccionado.countryCode,
      {
        texto: document.getElementById("ubicCasilla-texto").checked,
        mapa: document.getElementById("ubicCasilla-mapa").checked,
        bandera: document.getElementById("ubicCasilla-bandera").checked
      },
      { x: 10, y: 10, w: 40 }
    );
  });
  zonaAgregar.appendChild(btnAgregar);
  panelLateralContenido.appendChild(zonaAgregar);

  async function ejecutarBusqueda() {
    const consulta = input.value.trim();
    if (!consulta) return;
    resultados.innerHTML = '<p class="panel-vacio">Buscando...</p>';
    zonaAgregar.classList.add("oculto");
    lugarSeleccionado = null;
    try {
      const lugares = await buscarLugares(consulta);
      resultados.innerHTML = "";
      if (!lugares.length) {
        resultados.innerHTML = '<p class="panel-vacio">No encontramos ese lugar. Probá con otro nombre.</p>';
        return;
      }
      lugares.forEach((lugar) => {
        const boton = document.createElement("button");
        boton.className = "resultado-lugar";
        boton.textContent = lugar.display_name;
        boton.addEventListener("click", () => {
          resultados.querySelectorAll(".resultado-lugar").forEach((b) => b.classList.remove("seleccionado"));
          boton.classList.add("seleccionado");
          lugarSeleccionado = {
            nombre: lugar.display_name.split(",").slice(0, 2).join(","),
            lat: parseFloat(lugar.lat),
            lon: parseFloat(lugar.lon),
            countryCode: lugar.address && lugar.address.country_code ? lugar.address.country_code.toUpperCase() : null
          };
          zonaAgregar.classList.remove("oculto");
        });
        resultados.appendChild(boton);
      });
    } catch (e) {
      resultados.innerHTML = '<p class="panel-vacio">No se pudo buscar. Revisá tu conexión a internet.</p>';
    }
  }

  btnBuscar.addEventListener("click", ejecutarBusqueda);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); ejecutarBusqueda(); }
  });
}

/* ---------- CÓDIGO QR (para linkear video u otro archivo) ---------- */
function construirPanelQR() {
  panelLateralContenido.innerHTML = "";

  const info = document.createElement("p");
  info.className = "panel-vacio";
  info.style.textAlign = "left";
  info.style.margin = "0 0 12px";
  info.textContent = "Generá un código QR para que quien mire el libro pueda escanearlo con el celular y ver un video, una foto en Google Drive, o cualquier link.";
  panelLateralContenido.appendChild(info);

  const campo = document.createElement("div");
  campo.className = "campo-busqueda";
  const inputUrl = document.createElement("input");
  inputUrl.type = "text";
  inputUrl.placeholder = "https://...";
  campo.appendChild(inputUrl);
  panelLateralContenido.appendChild(campo);

  const filaCasilla = document.createElement("label");
  filaCasilla.className = "fila-casilla";
  filaCasilla.style.marginBottom = "14px";
  const chkTexto = document.createElement("input");
  chkTexto.type = "checkbox";
  chkTexto.checked = true;
  filaCasilla.appendChild(chkTexto);
  filaCasilla.appendChild(document.createTextNode('Agregar también un texto ("Escaneá para ver el video")'));
  panelLateralContenido.appendChild(filaCasilla);

  const btnAgregar = document.createElement("button");
  btnAgregar.className = "boton boton-primario";
  btnAgregar.style.width = "100%";
  btnAgregar.style.justifyContent = "center";
  btnAgregar.textContent = "🔳 Agregar código QR";
  btnAgregar.addEventListener("click", async () => {
    let url = inputUrl.value.trim();
    if (!url) {
      await abrirModal({ titulo: "Falta el link", mensaje: "Pegá primero la dirección del video o archivo.", textoOk: "Entendido", textoCancelar: "Cerrar" });
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const hojaObj = hojaEnPosicion(posicion);
    hojaObj.elementos.push({ tipo: "qr", url, x: 10, y: 10, w: 24, h: 24 });
    if (chkTexto.checked) {
      hojaObj.elementos.push({ tipo: "texto", x: 10, y: 35, w: 34, h: 8, fontSize: 2.8, texto: "📱 Escaneá para ver el video" });
    }
    guardarEstado();
    render();
    cerrarPanel();
  });
  panelLateralContenido.appendChild(btnAgregar);
}

/* ---------- TAMAÑO Y ORIENTACIÓN DEL LIBRO ---------- */
/* Tamaños inspirados en Shutterfly, Mixbook y Blurb (los formatos más comunes de libros de fotos) */
const TAMANOS_LIBRO = [
  { id: "cuadrado-20", nombre: "Cuadrado chico", medida: "20×20 cm (8×8″)", anchoIn: 8, altoIn: 8 },
  { id: "cuadrado-25", nombre: "Cuadrado mediano", medida: "25×25 cm (10×10″)", anchoIn: 10, altoIn: 10 },
  { id: "cuadrado-30", nombre: "Cuadrado grande", medida: "30×30 cm (12×12″)", anchoIn: 12, altoIn: 12 },
  { id: "retrato-8x10", nombre: "Retrato clásico", medida: "20×25 cm (8×10″)", anchoIn: 8, altoIn: 10 },
  { id: "retrato-carta", nombre: "Retrato carta", medida: "21.5×28 cm (8.5×11″)", anchoIn: 8.5, altoIn: 11 }
];

function tamanoActual() {
  return (estado.configuracion) || { anchoIn: 10, altoIn: 8 };
}

function aplicarTamanoLibro(anchoIn, altoIn) {
  estado.configuracion = { anchoIn, altoIn };
  guardarEstado();
  render();
}

function construirPanelTamano() {
  panelLateralContenido.innerHTML = "";
  const conf = tamanoActual();
  const esHorizontal = conf.anchoIn >= conf.altoIn;

  const filaOrientacion = document.createElement("div");
  filaOrientacion.className = "fila-orientacion";

  const btnVertical = document.createElement("button");
  btnVertical.className = "boton-orientacion" + (!esHorizontal ? " activo" : "");
  btnVertical.innerHTML = '<span class="icono-orientacion" style="width:20px;height:26px;"></span><span>Vertical</span>';
  btnVertical.addEventListener("click", () => {
    const mayor = Math.max(conf.anchoIn, conf.altoIn);
    const menor = Math.min(conf.anchoIn, conf.altoIn);
    if (mayor === menor) return;
    aplicarTamanoLibro(menor, mayor);
    construirPanelTamano();
  });
  filaOrientacion.appendChild(btnVertical);

  const btnHorizontal = document.createElement("button");
  btnHorizontal.className = "boton-orientacion" + (esHorizontal ? " activo" : "");
  btnHorizontal.innerHTML = '<span class="icono-orientacion" style="width:26px;height:20px;"></span><span>Horizontal</span>';
  btnHorizontal.addEventListener("click", () => {
    const mayor = Math.max(conf.anchoIn, conf.altoIn);
    const menor = Math.min(conf.anchoIn, conf.altoIn);
    if (mayor === menor) return;
    aplicarTamanoLibro(mayor, menor);
    construirPanelTamano();
  });
  filaOrientacion.appendChild(btnHorizontal);

  panelLateralContenido.appendChild(filaOrientacion);

  const rejilla = document.createElement("div");
  rejilla.className = "rejilla-tamanos";
  TAMANOS_LIBRO.forEach((t) => {
    // Cada tamaño se aplica siempre con su orientación natural (ej: "Retrato" da vertical).
    // Para verlo girado, elegilo y después usá el botón Horizontal/Vertical de arriba.
    const activo = conf.anchoIn === t.anchoIn && conf.altoIn === t.altoIn;

    const fila = document.createElement("button");
    fila.className = "fila-tamano" + (activo ? " activo" : "");
    const mini = document.createElement("span");
    mini.className = "icono-tamano-mini";
    const escala = 22 / Math.max(t.anchoIn, t.altoIn);
    mini.style.width = (t.anchoIn * escala) + "px";
    mini.style.height = (t.altoIn * escala) + "px";
    fila.appendChild(mini);
    const texto = document.createElement("span");
    texto.textContent = `${t.nombre} — ${t.medida}`;
    fila.appendChild(texto);
    fila.addEventListener("click", () => {
      aplicarTamanoLibro(t.anchoIn, t.altoIn);
      construirPanelTamano();
    });
    rejilla.appendChild(fila);
  });
  panelLateralContenido.appendChild(rejilla);

  const separador = document.createElement("div");
  separador.className = "separador-panel";
  panelLateralContenido.appendChild(separador);

  const subtitulo = document.createElement("p");
  subtitulo.className = "panel-vacio";
  subtitulo.style.textAlign = "left";
  subtitulo.style.margin = "0 0 10px";
  subtitulo.textContent = "Tamaño personalizado (en centímetros):";
  panelLateralContenido.appendChild(subtitulo);

  const filaPersonalizada = document.createElement("div");
  filaPersonalizada.className = "fila-personalizado";
  const inputAncho = document.createElement("input");
  inputAncho.type = "number"; inputAncho.min = "5"; inputAncho.step = "0.5";
  inputAncho.value = (conf.anchoIn * 2.54).toFixed(1);
  const porEl = document.createElement("span");
  porEl.textContent = "×";
  const inputAlto = document.createElement("input");
  inputAlto.type = "number"; inputAlto.min = "5"; inputAlto.step = "0.5";
  inputAlto.value = (conf.altoIn * 2.54).toFixed(1);
  const cmEl = document.createElement("span");
  cmEl.textContent = "cm";
  const btnAplicar = document.createElement("button");
  btnAplicar.className = "boton boton-chico";
  btnAplicar.textContent = "Aplicar";
  btnAplicar.addEventListener("click", () => {
    const anchoCm = parseFloat(inputAncho.value);
    const altoCm = parseFloat(inputAlto.value);
    if (!anchoCm || !altoCm || anchoCm < 5 || altoCm < 5) return;
    aplicarTamanoLibro(+(anchoCm / 2.54).toFixed(2), +(altoCm / 2.54).toFixed(2));
    construirPanelTamano();
  });
  filaPersonalizada.appendChild(inputAncho);
  filaPersonalizada.appendChild(porEl);
  filaPersonalizada.appendChild(inputAlto);
  filaPersonalizada.appendChild(cmEl);
  filaPersonalizada.appendChild(btnAplicar);
  panelLateralContenido.appendChild(filaPersonalizada);
}

/* ---------- PÁGINAS (tapa, contratapa y reordenar) ---------- */
function construirPanelPaginas() {
  panelLateralContenido.innerHTML = "";

  const filaTapa = document.createElement("div");
  filaTapa.className = "fila-pagina-fija";
  filaTapa.innerHTML = "<span>🎨</span>";
  const infoTapa = document.createElement("span");
  infoTapa.className = "info-pagina-fija";
  infoTapa.textContent = "Tapa";
  filaTapa.appendChild(infoTapa);
  const btnIrTapa = document.createElement("button");
  btnIrTapa.className = "boton";
  btnIrTapa.textContent = posicion === 0 ? "Editando" : "Editar";
  btnIrTapa.disabled = posicion === 0;
  btnIrTapa.addEventListener("click", () => { posicion = 0; render(); });
  filaTapa.appendChild(btnIrTapa);
  panelLateralContenido.appendChild(filaTapa);

  const lista = document.createElement("div");
  lista.className = "lista-paginas";

  function botonInsertarAqui(indice, etiqueta) {
    const btn = document.createElement("button");
    btn.className = "boton-insertar-aqui";
    btn.title = etiqueta;
    btn.textContent = "＋ insertar página acá";
    btn.addEventListener("click", () => insertarPaginaEnIndice(indice));
    return btn;
  }

  if (estado.paginas.length === 0) {
    lista.appendChild(botonInsertarAqui(0, "Agregar la primera página"));
  } else {
    lista.appendChild(botonInsertarAqui(0, "Insertar página al principio"));
    estado.paginas.forEach((p, i) => {
      const fila = document.createElement("div");
      fila.className = "fila-pagina" + (posicion === i + 1 ? " activa" : "");

      const miniatura = document.createElement("div");
      miniatura.className = "miniatura-pagina";
      aplicarFondo(miniatura, p.fondo);
      fila.appendChild(miniatura);

      const infoEl = document.createElement("span");
      infoEl.className = "info-pagina";
      infoEl.textContent = `Página ${i + 1}`;
      fila.appendChild(infoEl);

      const btnSubir = document.createElement("button");
      btnSubir.className = "boton boton-chico";
      btnSubir.textContent = "▲";
      btnSubir.title = "Mover antes";
      btnSubir.disabled = i === 0;
      btnSubir.addEventListener("click", () => moverPagina(i, i - 1));
      fila.appendChild(btnSubir);

      const btnBajar = document.createElement("button");
      btnBajar.className = "boton boton-chico";
      btnBajar.textContent = "▼";
      btnBajar.title = "Mover después";
      btnBajar.disabled = i === estado.paginas.length - 1;
      btnBajar.addEventListener("click", () => moverPagina(i, i + 1));
      fila.appendChild(btnBajar);

      const btnIr = document.createElement("button");
      btnIr.className = "boton boton-chico";
      btnIr.textContent = posicion === i + 1 ? "Editando" : "Editar";
      btnIr.disabled = posicion === i + 1;
      btnIr.addEventListener("click", () => { posicion = i + 1; render(); });
      fila.appendChild(btnIr);

      lista.appendChild(fila);
      lista.appendChild(botonInsertarAqui(i + 1, `Insertar página entre la ${i + 1} y la ${i + 2}`));
    });
  }

  panelLateralContenido.appendChild(lista);

  const filaContratapa = document.createElement("div");
  filaContratapa.className = "fila-pagina-fija";
  filaContratapa.style.marginTop = "10px";
  filaContratapa.innerHTML = "<span>🎨</span>";
  const infoContratapa = document.createElement("span");
  infoContratapa.className = "info-pagina-fija";
  infoContratapa.textContent = "Contratapa";
  filaContratapa.appendChild(infoContratapa);
  const ultimaPos = totalPosiciones() - 1;
  const btnIrContratapa = document.createElement("button");
  btnIrContratapa.className = "boton";
  btnIrContratapa.textContent = posicion === ultimaPos ? "Editando" : "Editar";
  btnIrContratapa.disabled = posicion === ultimaPos;
  btnIrContratapa.addEventListener("click", () => { posicion = ultimaPos; render(); });
  filaContratapa.appendChild(btnIrContratapa);
  panelLateralContenido.appendChild(filaContratapa);
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

function insertarPaginaEnIndice(indice) {
  estado.paginas.splice(indice, 0, hojaNuevaConPredeterminado());
  posicion = indice + 1;
  guardarEstado();
  if (panelActivo === "paginas") construirPanelPaginas();
  render();
}

function agregarPaginaNueva() {
  const tipo = tipoEnPosicion(posicion);
  let indiceInsercion;
  if (tipo === "tapa") indiceInsercion = 0;
  else if (tipo === "contratapa") indiceInsercion = estado.paginas.length;
  else indiceInsercion = posicion;
  insertarPaginaEnIndice(indiceInsercion);
}

document.getElementById("btnPaginaNueva").addEventListener("click", agregarPaginaNueva);

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

/* ---------- ZOOM DEL LIENZO (solo visual, no cambia los datos) ---------- */
let nivelZoom = 100;
const indicadorZoom = document.getElementById("indicadorZoom");

function aplicarZoom() {
  hojaContenedor.style.transform = `scale(${nivelZoom / 100})`;
  indicadorZoom.textContent = nivelZoom + "%";
}
document.getElementById("btnZoomMas").addEventListener("click", () => {
  nivelZoom = Math.min(160, nivelZoom + 10);
  aplicarZoom();
});
document.getElementById("btnZoomMenos").addEventListener("click", () => {
  nivelZoom = Math.max(50, nivelZoom - 10);
  aplicarZoom();
});
document.getElementById("btnZoomReset").addEventListener("click", () => {
  nivelZoom = 100;
  aplicarZoom();
});

/* ---------- TAMAÑO DE LA INTERFAZ (barras más grandes o chicas) ---------- */
const NIVELES_DENSIDAD = ["compacta", "normal", "grande"];
const ETIQUETAS_DENSIDAD = { compacta: "🔎－", normal: "🔎", grande: "🔎＋" };
let densidadActual = localStorage.getItem("libroFotosDensidadUI") || "normal";

function aplicarDensidad() {
  const app = document.querySelector(".app");
  app.classList.remove("densidad-compacta", "densidad-grande");
  if (densidadActual !== "normal") app.classList.add("densidad-" + densidadActual);
  document.getElementById("btnDensidad").textContent = ETIQUETAS_DENSIDAD[densidadActual];
  localStorage.setItem("libroFotosDensidadUI", densidadActual);
}
document.getElementById("btnDensidad").addEventListener("click", () => {
  const i = NIVELES_DENSIDAD.indexOf(densidadActual);
  densidadActual = NIVELES_DENSIDAD[(i + 1) % NIVELES_DENSIDAD.length];
  aplicarDensidad();
});
aplicarDensidad();

/* ---------- DESHACER / REHACER ---------- */
document.getElementById("btnDeshacer").addEventListener("click", deshacer);
document.getElementById("btnRehacer").addEventListener("click", rehacer);

function elementoActivoEsEditable() {
  const ae = document.activeElement;
  if (!ae) return false;
  return ae.isContentEditable || ae.tagName === "INPUT" || ae.tagName === "TEXTAREA";
}

document.addEventListener("keydown", (e) => {
  if (elementoActivoEsEditable()) return;
  const combo = e.ctrlKey || e.metaKey;
  if (!combo) return;
  if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); deshacer(); }
  else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) { e.preventDefault(); rehacer(); }
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
  panelLateralContenido.innerHTML = "";

  const btnNuevo = document.createElement("button");
  btnNuevo.className = "boton boton-primario";
  btnNuevo.style.width = "100%";
  btnNuevo.style.justifyContent = "center";
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
  panelLateralContenido.appendChild(btnNuevo);

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
      btnAbrir.className = "boton boton-chico";
      btnAbrir.textContent = "Abrir";
      btnAbrir.addEventListener("click", () => cambiarProyecto(p.id));
      fila.appendChild(btnAbrir);
    }

    const btnRenombrar = document.createElement("button");
    btnRenombrar.className = "boton boton-chico";
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
    btnEliminar.className = "boton boton-chico boton-peligro";
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

  panelLateralContenido.appendChild(lista);
}

function cambiarProyecto(id) {
  const nuevoEstado = leerEstadoDeProyecto(id);
  if (!nuevoEstado) return;
  const registro = cargarRegistro();
  registro.proyectoActivoId = id;
  guardarRegistroDirecto(registro);
  estado = nuevoEstado;
  posicion = 0;
  reiniciarHistorial();
  actualizarNombreProyectoActivo();
  render();
  cerrarPanel();
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
  reiniciarHistorial();
  actualizarNombreProyectoActivo();
  construirPanelProyectos();
  render();
}

document.getElementById("btnProyectos").addEventListener("click", () => {
  if (panelActivo === "proyectos") { cerrarPanel(); return; }
  panelActivo = "proyectos";
  panelLateralTitulo.textContent = "Mis proyectos";
  construirPanelProyectos();
  panelLateral.classList.remove("oculto");
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Montserrat:wght@400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
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

/* ==========================================================
   EXPORTAR PARA IMPRIMIR (PDF listo para Blurb, Shutterfly, etc.)
   Usa la función de "Imprimir" del navegador: al elegir
   "Guardar como PDF" se genera un archivo con el tamaño real
   del libro, sin depender de ninguna librería externa.
   ========================================================== */
function construirElementoHTMLEstatico(el) {
  const estilo = `left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;`;
  if (el.tipo === "foto") {
    if (el.vacio || !el.src) return "";
    const posicionFoto = `${el.posX ?? 50}% ${el.posY ?? 50}%`;
    return `<div class="el-imp" style="${estilo}"><img src="${el.src}" style="width:100%;height:100%;object-fit:cover;object-position:${posicionFoto};display:block;"></div>`;
  }
  if (el.tipo === "mapa") {
    return `<div class="el-imp" style="${estilo}"><img src="${construirURLMapa(el.lat, el.lon, el.estilo)}" style="width:100%;height:100%;object-fit:cover;display:block;"></div>`;
  }
  if (el.tipo === "bandera") {
    if (el.formato === "imagen") {
      return `<div class="el-imp" style="${estilo}"><img src="https://flagcdn.com/w320/${el.codigoPais.toLowerCase()}.png" style="width:100%;height:100%;object-fit:contain;display:block;"></div>`;
    }
    return `<div class="el-imp" style="${estilo};display:flex;align-items:center;justify-content:center;font-size:20cqw;">${codigoPaisABandera(el.codigoPais)}</div>`;
  }
  if (el.tipo === "qr") {
    return `<div class="el-imp" style="${estilo};background:#fff;"><img src="${construirURLQR(el.url)}" style="width:100%;height:100%;object-fit:contain;display:block;"></div>`;
  }
  // texto / titulo / subtitulo
  const color = (el.tipo === "titulo" || el.tipo === "subtitulo") ? "#f5e9d8" : "#3b2a1a";
  const peso = el.tipo === "titulo" ? "bold" : "normal";
  const justif = MAPA_ALINEACION[el.alineacion || "centro"];
  const alinTexto = el.alineacion === "izquierda" ? "left" : el.alineacion === "derecha" ? "right" : "center";
  return `<div class="el-imp" style="${estilo};display:flex;align-items:center;justify-content:${justif};text-align:${alinTexto};font-family:${MAPA_FUENTES[el.fuente || "georgia"]};font-size:${el.fontSize}cqw;font-weight:${peso};color:${color};white-space:pre-wrap;overflow:hidden;">${escaparHTML(el.texto)}</div>`;
}

function generarHTMLParaImprimir() {
  const conf = tamanoActual();
  const todasLasHojas = [estado.tapa, ...estado.paginas, estado.contratapa];

  const paginasHTML = todasLasHojas.map((hojaObj) => {
    const elementosHTML = hojaObj.elementos.map(construirElementoHTMLEstatico).join("");
    const fondoCSS = hojaObj.fondo.tipo === "foto"
      ? `background-image:url('${hojaObj.fondo.valor}');background-size:cover;background-position:center;`
      : `background-color:${hojaObj.fondo.valor};`;
    return `<div class="pagina-imp" style="${fondoCSS}">${elementosHTML}</div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Montserrat:wght@400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>
  @page { size: ${conf.anchoIn}in ${conf.altoIn}in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ccc; }
  .pagina-imp {
    position: relative;
    width: ${conf.anchoIn}in;
    height: ${conf.altoIn}in;
    overflow: hidden;
    break-after: page;
    page-break-after: always;
    container-type: inline-size;
    margin: 0 auto 12px;
    background: #fffdf8;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  @media print {
    .pagina-imp { margin: 0; box-shadow: none; }
    html, body { background: #fff; }
  }
  .el-imp { position: absolute; }
</style>
</head>
<body>${paginasHTML}</body>
</html>
`;
}

const overlayImprimir = document.getElementById("overlayImprimir");
const iframeImprimir = document.getElementById("iframeImprimir");

document.getElementById("btnExportarImprimir").addEventListener("click", () => {
  iframeImprimir.srcdoc = generarHTMLParaImprimir();
  overlayImprimir.classList.remove("oculto");
});

document.getElementById("btnCerrarImprimir").addEventListener("click", () => {
  overlayImprimir.classList.add("oculto");
  iframeImprimir.srcdoc = "";
});

document.getElementById("btnImprimirAhora").addEventListener("click", () => {
  iframeImprimir.contentWindow.focus();
  iframeImprimir.contentWindow.print();
});

/* ---------- ARRANQUE ---------- */
actualizarNombreProyectoActivo();
actualizarBotonesHistorial();
render();
