const API_URL = "https://script.google.com/macros/s/AKfycbwPXMOnkX4B6ifIJ3ml7BKKtkJJvEEYgYnCxZgVtsirVYJWE0RjdGQ5jgHlU0eMEkCG/exec";

let user = localStorage.getItem("user");
let items = [];
let filter = "todos";
let loading = false;
let adding = false;
let lastServerSignature = null;
let lastRenderedData = "";
let lastRenderedFilter = "";
let pollTimer;

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
    startPolling();
  }

  window.addEventListener("focus", refreshWhenVisible);
  window.addEventListener("pageshow", refreshWhenVisible);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshWhenVisible();
  });
});

function saveUser() {
  const name = document.getElementById("userName").value.trim();
  if (!name) return;

  user = name;
  localStorage.setItem("user", user);
  showApp();
  loadItems();
  startPolling();
}

function showApp() {
  document.getElementById("userBox").classList.add("hidden");
  document.getElementById("main").classList.remove("hidden");
  document.getElementById("hello").innerText = "Olá " + user;
}

function setFilter(nextFilter) {
  filter = nextFilter;
  lastRenderedFilter = "";
  render();

  document.querySelectorAll(".filters button").forEach(button => {
    button.classList.toggle("active", button.id === `f_${filter === "todos" ? "all" : filter === "por" ? "todo" : "done"}`);
  });
}

function showStatus(message = "", type = "") {
  const status = document.getElementById("status");
  if (!status) return;
  status.textContent = message;
  status.className = "status" + (type ? ` ${type}` : "");
}

async function loadItems({ silent = false } = {}) {
  if (loading || !user || document.visibilityState === "hidden") return false;
  loading = true;

  try {
    const response = await fetch(`${API_URL}?action=listar&_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta inesperada do servidor");

    const signature = JSON.stringify(data);
    const changed = signature !== lastServerSignature;
    lastServerSignature = signature;
    if (changed) {
      items = data;
      lastRenderedData = "";
      render();
    }

    if (!silent) showStatus("");
    return true;
  } catch (error) {
    if (!silent) showStatus("Não foi possível atualizar a lista. Verifica a ligação.", "error");
    return false;
  } finally {
    loading = false;
  }
}

function refreshWhenVisible() {
  if (user && document.visibilityState !== "hidden") loadItems({ silent: true });
}

function startPolling() {
  clearInterval(pollTimer);
  // Atualiza a lista partilhada sem redesenhar a página a cada poucos segundos.
  pollTimer = setInterval(() => {
    if (document.visibilityState === "visible") loadItems({ silent: true });
  }, 20000);
}

function render() {
  const visibleItems = items.filter(item => {
    if (filter === "por") return !item.comprado;
    if (filter === "feitos") return Boolean(item.comprado);
    return true;
  });

  const signature = JSON.stringify({ filter, items: visibleItems });
  if (signature === lastRenderedData && filter === lastRenderedFilter) return;
  lastRenderedData = signature;
  lastRenderedFilter = filter;

  const list = document.getElementById("lista");
  const fragment = document.createDocumentFragment();

  visibleItems.forEach(item => {
    const card = document.createElement("div");
    card.className = "item";
    if (item.comprado) card.classList.add("comprado");
    if (item.localPending) card.classList.add("pending");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", item.localPending ? "-1" : "0");
    card.setAttribute("aria-label", `${item.produto}, ${item.comprado ? "comprado" : "por comprar"}`);

    const info = document.createElement("div");
    info.className = "item-info";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${item.produto} (${item.quantidade})`;

    const sub = document.createElement("div");
    sub.className = "item-sub";
    sub.textContent = item.utilizador || user;

    info.append(title, sub);

    const del = document.createElement("button");
    del.className = "delete";
    del.type = "button";
    del.textContent = "🗑";
    del.setAttribute("aria-label", `Apagar ${item.produto}`);
    del.disabled = Boolean(item.localPending || item.pending);
    del.addEventListener("click", event => {
      event.stopPropagation();
      deleteItem(item.id);
    });

    const toggle = () => {
      if (!item.localPending && !item.pending) toggleItem(item.id, !item.comprado);
    };
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });

    card.append(info, del);
    fragment.appendChild(card);
  });

  list.replaceChildren(fragment);
}

async function sendAction(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

async function toggleItem(id, value) {
  const item = items.find(entry => String(entry.id) === String(id));
  if (!item) return;

  const previousValue = item.comprado;
  item.comprado = value;
  item.pending = true;
  render();

  try {
    await sendAction({ action: "atualizar", id, comprado: value });
    item.pending = false;
    lastRenderedData = "";
    render();
    showStatus("");
  } catch (error) {
    item.comprado = previousValue;
    item.pending = false;
    lastRenderedData = "";
    render();
    showStatus("Não foi possível guardar a alteração. Tenta novamente.", "error");
  }
}

async function deleteItem(id) {
  const index = items.findIndex(entry => String(entry.id) === String(id));
  if (index < 0) return;

  const [item] = items.splice(index, 1);
  render();

  try {
    await sendAction({ action: "apagar", id });
    showStatus("");
  } catch (error) {
    items.splice(index, 0, item);
    lastRenderedData = "";
    render();
    showStatus("Não foi possível apagar o artigo. Tenta novamente.", "error");
  }
}

function addRow() {
  const row = document.createElement("div");
  row.className = "row";

  const product = document.createElement("input");
  product.className = "prod";
  product.placeholder = "Produto";
  product.autocomplete = "off";

  const quantity = document.createElement("input");
  quantity.className = "qty";
  quantity.type = "number";
  quantity.placeholder = "Qt";
  quantity.autocomplete = "off";

  product.addEventListener("input", checkLastRow);
  quantity.addEventListener("input", checkLastRow);
  row.append(product, quantity);
  document.getElementById("rows").appendChild(row);
}

function checkLastRow() {
  const rows = document.querySelectorAll(".row");
  const last = rows[rows.length - 1];
  if (!last) return;

  const product = last.querySelector(".prod").value.trim();
  const quantity = last.querySelector(".qty").value.trim();
  if (product || quantity) addRow();
}

async function addAllItems() {
  if (adding) return;

  const rows = [...document.querySelectorAll(".row")];
  const entries = rows.map(row => ({
    produto: row.querySelector(".prod").value.trim(),
    quantidade: row.querySelector(".qty").value.trim() || 1
  })).filter(entry => entry.produto);

  if (!entries.length) {
    document.querySelector(".prod")?.focus();
    return;
  }

  adding = true;
  const button = document.getElementById("addAllBtn");
  button.disabled = true;

  // Mostra os artigos imediatamente; a gravação na folha continua em segundo plano.
  const temporaryItems = entries.map((entry, index) => ({
    id: `local-${Date.now()}-${index}`,
    produto: entry.produto,
    quantidade: entry.quantidade,
    utilizador: user,
    comprado: false,
    localPending: true
  }));
  items.push(...temporaryItems);
  document.getElementById("rows").replaceChildren();
  addRow();
  lastRenderedData = "";
  render();
  showStatus("A guardar artigos…", "working");

  let failed = false;
  try {
    for (const entry of entries) {
      try {
        await sendAction({
          action: "adicionar",
          produto: entry.produto,
          quantidade: entry.quantidade,
          categoria: "",
          utilizador: user
        });
      } catch (error) {
        failed = true;
      }
    }

    items = items.filter(item => !item.localPending);
    lastRenderedData = "";
    render();
    await loadItems({ silent: true });
    if (failed) showStatus("A ligação falhou durante o envio. Confirma a lista antes de repetir.", "error");
    else showStatus("Artigos adicionados.", "success");
  } finally {
    adding = false;
    button.disabled = false;
  }
}
