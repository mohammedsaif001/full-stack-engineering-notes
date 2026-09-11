const socket = io();
const container = document.getElementById("container");
const errorBanner = document.getElementById("error");

let lastOptimisticIndex = null;

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.style.display = "block";
  setTimeout(() => {
    errorBanner.style.display = "none";
  }, 1500);
}

function onCheckboxClick(index, input) {
  lastOptimisticIndex = index;
  socket.emit("client:checkbox:change", { index, checked: input.checked });
}

function renderCheckboxes(state) {
  container.innerHTML = "";
  state.forEach((checked, index) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `checkbox-${index}`;
    input.checked = checked;
    input.addEventListener("change", () => onCheckboxClick(index, input));
    container.appendChild(input);
  });
}

async function loadInitialState() {
  const res = await fetch("/checkboxes");
  const { checkboxes } = await res.json();
  renderCheckboxes(checkboxes);
}

socket.on("server:checkbox:change", ({ index, checked }) => {
  const input = document.getElementById(`checkbox-${index}`);
  if (input) input.checked = checked;
});

socket.on("server:error", ({ error }) => {
  showError(error);

  if (lastOptimisticIndex !== null) {
    const input = document.getElementById(`checkbox-${lastOptimisticIndex}`);
    if (input) input.checked = !input.checked;
    lastOptimisticIndex = null;
  }
});

loadInitialState();
