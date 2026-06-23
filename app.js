const API_URL = "https://script.google.com/macros/s/AKfycbwPXMOnkX4B6ifIJ3ml7BKKtkJJvEEYgYnCxZgVtsirVYJWE0RjdGQ5jgHlU0eMEkCG/exec";

let user = localStorage.getItem("user");
let items = [];
let filter = "todos";

window.addEventListener("load", () => {
  addRow();
  document.getElementById("saveBtn").addEventListener("click", saveUser);
  document.getElementById("f_all").onclick = () => setFilter("todos");
  document.getElementById("f_todo").onclick = () => setFilter("por");
  document.getElementById("f_done").onclick = () => setFilter("feitos");

  if (user) {
    showApp();
    loadItems();
  }
});

function saveUser() {
  user = document.getElementById("userName").value;
  if (!user) return;

  localStorage.setItem("user", user);
  showApp();
  loadItems();
}

function showApp() {
  document.getElementById("userBox").classList.add("hidden");
  document.getElementById("main").classList.remove("hidden");
  document.getElementById("hello").innerText = "Olá " + user;
}

function setFilter(f) {
  filter = f;
  render();
}



async function loadItems() {
  const res = await fetch(API_URL + "?action=listar");
  items = await res.json();
  render();
}

function render() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  let filtered = items;

  if (filter === "por") {
    filtered = items.filter(i => !i.comprado);
  }

  if (filter === "feitos") {
    filtered = items.filter(i => i.comprado);
  }

  filtered.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";

    // swipe delete
    let startX = 0;

    div.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX;
    });

    div.addEventListener("touchend", e => {
      let diff = e.changedTouches[0].clientX - startX;
      if (diff < -80) {
        deleteItem(item.id);
      }
    });

   const info = document.createElement("div");
info.className = "item-info";

const title = document.createElement("div");
title.className = "item-title";
title.textContent = `${item.produto} (${item.quantidade})`;

const sub = document.createElement("div");
sub.className = "item-sub";
sub.textContent = item.utilizador;

info.appendChild(title);
info.appendChild(sub);

const del = document.createElement("div");
del.className = "delete";
del.textContent = "🗑";

del.addEventListener("click", (e) => {
  e.stopPropagation();
  deleteItem(item.id);
});

if (item.comprado) {
  div.classList.add("comprado");
}

div.addEventListener("click", () => {
  toggleItem(item.id, !item.comprado);
});

div.appendChild(info);
div.appendChild(del);
    
async function deleteItem(id) {
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "apagar",
      id
    })
  });

  loadItems();
}

// sync mais leve
setInterval(loadItems, 8000);

async function toggleItem(id, value) {
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "atualizar",
      id: id,
      comprado: value
    })
  });

  loadItems();
}

window.addEventListener("load", () => {
  document.getElementById("addAllBtn").addEventListener("click", addAllItems);
});

function addRow() {

  const div = document.createElement("div");
  div.className = "row";

  const prod = document.createElement("input");
  prod.className = "prod";
  prod.placeholder = "Produto";
  prod.autocomplete = "off";

  const qty = document.createElement("input");
  qty.className = "qty";
  qty.type = "number";
  qty.placeholder = "Qt";
  qty.autocomplete = "off";

  // Verifica se é necessário criar nova linha
  prod.addEventListener("input", checkLastRow);
  qty.addEventListener("input", checkLastRow);

  div.appendChild(prod);
  div.appendChild(qty);

  document.getElementById("rows").appendChild(div);
}

function checkLastRow() {

  const rows = document.querySelectorAll(".row");

  if (rows.length === 0) return;

  const lastRow = rows[rows.length - 1];

  const prod = lastRow.querySelector(".prod").value.trim();
  const qty = lastRow.querySelector(".qty").value.trim();

  if (prod !== "" || qty !== "") {
    addRow();
  }
}

async function addAllItems() {
  const rows = document.querySelectorAll(".row");

  for (const r of rows) {
    const produto = r.querySelector(".prod").value;
    const quantidade = r.querySelector(".qty").value;

    if (!produto) continue;

    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "adicionar",
        produto,
        quantidade: quantidade || 1,
        categoria: "",
        utilizador: user
      })
    });
  }

  // reset
  document.getElementById("rows").innerHTML = `
    <div class="row">
      <input class="prod" placeholder="Produto">
      <input class="qty" type="number" placeholder="Qt">
    </div>
  `;

  loadItems();
}
