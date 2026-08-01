/* Visor del libro de fotos. Este archivo lee window.DATOS_LIBRO
   (definido dentro de index.html) y dibuja las páginas.
   No hace falta editar este archivo: usá editor.html. */

const datos = window.DATOS_LIBRO || {
  tapa: { fondo: { tipo: "color", valor: "#2b1d14" }, elementos: [] },
  paginas: [],
  contratapa: { fondo: { tipo: "color", valor: "#2b1d14" }, elementos: [] }
};

let posicion = 0;
let abierto = false;

const hoja = document.getElementById("hoja");
const contador = document.getElementById("contador");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnAbrir = document.getElementById("btnAbrir");

function totalPosiciones() {
  return datos.paginas.length + 2;
}
function tipoEnPosicion(pos) {
  if (pos === 0) return "tapa";
  if (pos === totalPosiciones() - 1) return "contratapa";
  return "pagina";
}
function hojaEnPosicion(pos) {
  const tipo = tipoEnPosicion(pos);
  if (tipo === "tapa") return datos.tapa;
  if (tipo === "contratapa") return datos.contratapa;
  return datos.paginas[pos - 1];
}

const ESTILOS_MAPA = {
  estandar: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  topografico: (z, x, y) => `https://a.tile.opentopomap.org/${z}/${x}/${y}.png`,
  ciclismo: (z, x, y) => `https://a.tile-cyclosm.openstreetmap.fr/cyclosm/${z}/${x}/${y}.png`,
  humanitario: (z, x, y) => `https://tile-a.openstreetmap.fr/hot/${z}/${x}/${y}.png`
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

const MAPA_FUENTES = {
  georgia: "'Georgia', serif",
  clasica: "'Times New Roman', serif",
  moderna: "'Montserrat', 'Segoe UI', sans-serif",
  maquina: "'Courier New', monospace",
  titular: "'Playfair Display', Georgia, serif",
  manuscrita: "'Caveat', cursive"
};

function codigoPaisABandera(codigoPais) {
  if (!codigoPais || codigoPais.length !== 2) return "🏳️";
  return String.fromCodePoint(...codigoPais.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)));
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

function pintar() {
  const hojaObj = hojaEnPosicion(posicion);
  aplicarFondo(hoja, hojaObj.fondo);
  hoja.innerHTML = "";

  hojaObj.elementos.forEach((el) => {
    const div = document.createElement("div");
    div.className = "elemento " + el.tipo;
    div.style.left = el.x + "%";
    div.style.top = el.y + "%";
    div.style.width = el.w + "%";
    div.style.height = el.h + "%";

    if (el.tipo === "foto") {
      if (!el.vacio && el.src) {
        const img = document.createElement("img");
        img.src = el.src;
        img.alt = "";
        div.appendChild(img);
      }
    } else if (el.tipo === "mapa") {
      const img = document.createElement("img");
      img.src = construirURLMapa(el.lat, el.lon, el.estilo);
      img.alt = "Mapa de ubicación";
      div.appendChild(img);
      const pin = document.createElement("span");
      pin.className = "pin-mapa";
      pin.textContent = "📍";
      div.appendChild(pin);
    } else if (el.tipo === "bandera") {
      if (el.formato === "imagen") {
        const img = document.createElement("img");
        img.src = `https://flagcdn.com/w320/${el.codigoPais.toLowerCase()}.png`;
        img.alt = "Bandera";
        div.appendChild(img);
      } else {
        const span = document.createElement("span");
        span.className = "emoji-bandera";
        span.textContent = codigoPaisABandera(el.codigoPais);
        div.appendChild(span);
      }
    } else {
      div.style.fontSize = el.fontSize + "cqw";
      div.style.fontFamily = MAPA_FUENTES[el.fuente || "georgia"];
      div.textContent = el.texto;
    }

    hoja.appendChild(div);
  });

  contador.textContent = `${posicion + 1} / ${totalPosiciones()}`;
  btnPrev.style.visibility = posicion === 0 ? "hidden" : "visible";
  btnNext.style.visibility = posicion === totalPosiciones() - 1 ? "hidden" : "visible";
  btnAbrir.classList.toggle("oculto", abierto || posicion !== 0);
}

function cambiarPosicion(direccion) {
  const claseGiro = direccion === 1 ? "girando-sig" : "girando-ant";
  hoja.classList.add(claseGiro);
  setTimeout(() => {
    posicion += direccion;
    pintar();
    hoja.classList.remove(claseGiro);
  }, 350);
}

btnNext.addEventListener("click", () => {
  if (posicion < totalPosiciones() - 1) cambiarPosicion(1);
});
btnPrev.addEventListener("click", () => {
  if (posicion > 0) cambiarPosicion(-1);
});

btnAbrir.addEventListener("click", () => {
  abierto = true;
  contador.classList.remove("oculto");
  btnPrev.classList.remove("oculto");
  btnNext.classList.remove("oculto");
  if (posicion < totalPosiciones() - 1) cambiarPosicion(1);
  else pintar();
});

document.addEventListener("keydown", (e) => {
  if (!abierto) return;
  if (e.key === "ArrowRight") btnNext.click();
  if (e.key === "ArrowLeft") btnPrev.click();
});

let inicioX = null;
hoja.addEventListener("touchstart", (e) => {
  inicioX = e.touches[0].clientX;
});
hoja.addEventListener("touchend", (e) => {
  if (inicioX === null || !abierto) return;
  const dif = e.changedTouches[0].clientX - inicioX;
  if (dif < -40) btnNext.click();
  if (dif > 40) btnPrev.click();
  inicioX = null;
});

pintar();
