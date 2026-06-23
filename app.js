const API_URL = "https://script.google.com/macros/s/AKfycbwPXMOnkX4B6ifIJ3ml7BKKtkJJvEEYgYnCxZgVtsirVYJWE0RjdGQ5jgHlU0eMEkCG/exec";

let user = localStorage.getItem("user");
let items = [];
let filter = "todos";

window.addEventListener("load", () => {

  addRow();

  document.getElementById("saveBtn").addEventListener("click", saveUser);
  document.getElementById("addAllBtn").addEventListener("click", addAllItems);

  document.getElementById("f_all").onclick = () => setFilter("todos");
  document.getElementById("f_todo").onclick = () => setFilter("por");
  document.getElementById("f_done").onclick = () => setFilter("feitos");

  if (user) {
    showApp();
    loadItems();
  }
});

function saveUser() {
  user = document.getElementById("userName").value.trim();

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

  let filtered = [...items];

  if (filter === "por") {
    filtered = filtered.filter(i => !i.comprado);
  }

  if (filter === "feitos") {
    filtered = filtered.filter(i => i.comprado);
  }

  filtered.forEach(item => {

    const div = document.createElement("div");
    div.className = "item";

    if (item.comprado) {
      div.classList.add("comprado");
    }

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

    div.addEventListener("click", () => {
      toggleItem(item.id, !item.comprado);
    });

    div.appendChild(info);
    div.appendChild(del);

    lista.appendChild(div);
  });
}

async function toggleItem(id, value) {

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "atualizar",
      id,
      comprado: value
    })
  });

  loadItems();
}

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

  prod.addEventListener("input", checkLastRow);
  qty.addEventListener("input", checkLastRow);

  div.appendChild(prod);
  div.appendChild(qty);

  document.getElementById("rows").appendChild(div);
}

function checkLastRow() {

  const rows = document.querySelectorAll(".row");

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

    const produto = r.querySelector(".prod").value.trim();
    const quantidade = r.querySelector(".qty").value.trim();

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

  document.getElementById("rows").innerHTML = "";
  addRow();

  loadItems();
}

setInterval(loadItems, 5000);
