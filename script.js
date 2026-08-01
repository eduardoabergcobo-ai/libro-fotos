/* Visor del libro de fotos. Este archivo lee window.DATOS_LIBRO
   (definido dentro de index.html) y dibuja las páginas.
   No hace falta editar este archivo: usá editor.html. */

const datos = window.DATOS_LIBRO || { titulo: "", subtitulo: "", paginas: [] };
let pagina = 0;

const tapa = document.getElementById("tapa");
const libro = document.getElementById("libro");
const hoja = document.getElementById("hoja");
const contador = document.getElementById("contador");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnAbrir = document.getElementById("btnAbrir");

document.getElementById("tituloLibro").textContent = datos.titulo || "Nuestro Libro de Fotos";
document.getElementById("subtituloLibro").textContent = datos.subtitulo || "";

function pintarPagina() {
  hoja.innerHTML = "";
  const p = datos.paginas[pagina];
  if (!p) return;

  p.elementos.forEach((el) => {
    const div = document.createElement("div");
    div.className = "elemento " + el.tipo;
    div.style.left = el.x + "%";
    div.style.top = el.y + "%";
    div.style.width = el.w + "%";
    div.style.height = el.h + "%";

    if (el.tipo === "foto") {
      const img = document.createElement("img");
      img.src = el.src;
      img.alt = "";
      div.appendChild(img);
    } else {
      div.style.fontSize = el.fontSize + "cqw";
      div.textContent = el.texto;
    }

    hoja.appendChild(div);
  });

  contador.textContent = `${pagina + 1} / ${datos.paginas.length}`;
  btnPrev.style.visibility = pagina === 0 ? "hidden" : "visible";
  btnNext.style.visibility = pagina === datos.paginas.length - 1 ? "hidden" : "visible";
}

function cambiarPagina(direccion) {
  const claseGiro = direccion === 1 ? "girando-sig" : "girando-ant";
  hoja.classList.add(claseGiro);

  setTimeout(() => {
    pagina += direccion;
    pintarPagina();
    hoja.classList.remove(claseGiro);
  }, 350);
}

btnNext.addEventListener("click", () => {
  if (pagina < datos.paginas.length - 1) cambiarPagina(1);
});

btnPrev.addEventListener("click", () => {
  if (pagina > 0) cambiarPagina(-1);
});

btnAbrir.addEventListener("click", () => {
  tapa.classList.add("oculto");
  libro.classList.remove("oculto");
  pintarPagina();
});

document.addEventListener("keydown", (e) => {
  if (libro.classList.contains("oculto")) return;
  if (e.key === "ArrowRight") btnNext.click();
  if (e.key === "ArrowLeft") btnPrev.click();
});

let inicioX = null;
hoja.addEventListener("touchstart", (e) => {
  inicioX = e.touches[0].clientX;
});
hoja.addEventListener("touchend", (e) => {
  if (inicioX === null) return;
  const dif = e.changedTouches[0].clientX - inicioX;
  if (dif < -40) btnNext.click();
  if (dif > 40) btnPrev.click();
  inicioX = null;
});
