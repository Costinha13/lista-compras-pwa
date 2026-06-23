const API_URL = "https://script.google.com/macros/s/AKfycbwPXMOnkX4B6ifIJ3ml7BKKtkJJvEEYgYnCxZgVtsirVYJWE0RjdGQ5jgHlU0eMEkCG/exec";

let user = localStorage.getItem("user");
let items = [];
let filter = "todos";

window.addEventListener("load", () => {
  document.getElementById("saveBtn").addEventListener("click", saveUser);
  document.getElementById("addBtn").addEventListener("click", addItem);

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

async function addItem() {
  const produto = document.getElementById("produto").value;
  const quantidade = document.getElementById("quantidade").value;
  const categoria = document.getElementById("categoria").value;

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "adicionar",
      produto,
      quantidade,
      categoria,
      utilizador: user
    })
  });

  loadItems();
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

    // swipe simples
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

    div.innerHTML = `
      <div class="item-left">
        <div class="item-title ${item.comprado ? 'done' : ''}">
          ${item.produto} (${item.quantidade})
        </div>
        <div class="item-sub">${item.utilizador}</div>
      </div>

      <div class="delete">🗑</div>
    `;

    div.querySelector(".delete").onclick = () => deleteItem(item.id);

    lista.appendChild(div);
  });
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

// sync mais leve
setInterval(loadItems, 8000);
