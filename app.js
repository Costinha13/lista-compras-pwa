const API_URL = "https://script.google.com/macros/s/AKfycbwPXMOnkX4B6ifIJ3ml7BKKtkJJvEEYgYnCxZgVtsirVYJWE0RjdGQ5jgHlU0eMEkCG/exec";

let user = localStorage.getItem("user");

window.onload = () => {
if (user) {
showApp();
loadItems();
}
};

function saveUser() {
user = document.getElementById("userName").value;
localStorage.setItem("user", user);
showApp();
}

function showApp() {
document.getElementById("userBox").classList.add("hidden");
document.getElementById("main").classList.remove("hidden");
document.getElementById("hello").innerText = "Olá " + user;
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
const data = await res.json();

const lista = document.getElementById("lista");
lista.innerHTML = "";

data.forEach(item => {
const div = document.createElement("div");
div.className = "item";

```
div.innerHTML = `
  <span>
    ${item.produto} (${item.quantidade}) - ${item.utilizador}
  </span>
  <input type="checkbox" ${item.comprado ? "checked" : ""} 
    onchange="toggle(${item.id}, this.checked)">
`;

lista.appendChild(div);
```

});
}

async function toggle(id, value) {
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

setInterval(loadItems, 5000);
