const form = document.querySelector("form")
const result = document.querySelector("div.result")

const numbers = document.getElementById("numbers")
const from = document.getElementById("from")
const to = document.getElementById("to")
const repeat = document.getElementById("repeat")
const btnTryAgain = document.getElementById("btn-try-again")

const errorBox = document.querySelector(".error-message")

const drawnNumber = document.querySelector(".result-content p")

// let timeoutIds = []
let renderController = null


function clearErrors() {
  errorBox.textContent = ""
  errorBox.classList.add("hidden")
  ;[numbers, from, to].forEach((input) => input.closest(".field div")?.classList.remove("input-error"))
}

function showErrors(messages, inputs = []) {
  errorBox.innerHTML = messages.map((msg) => `<span>${msg}</span>`).join("<br>")
  errorBox.classList.remove("hidden")
  inputs.forEach((input) => input.closest(".field div")?.classList.add("input-error"))
}

function validateForm() {
  clearErrors()

  const messages = []
  const invalidInputs = []

  // 1. Campos não podem ser vazios
  const fields = [
    { input: numbers, label: "Números" },
    { input: from, label: "De" },
    { input: to, label: "Até" },
  ]

  for (const { input, label } of fields) {
    let value = input.value.trim()

    if (value === "") {
      messages.push(`O campo "${label}" não pode estar vazio.`)
      invalidInputs.push(input)
      continue
    }

    // somente dígitos (números inteiros positivos, sem sinal, sem decimais)
    if (!/^\d+$/.test(value)) {
      messages.push(`O campo "${label}" deve conter apenas números positivos e inteiros.`)
      invalidInputs.push(input)
      continue
    }

    // máximo de 3 dígitos (0 a 999)
    if (value.length > 3) {
      messages.push(`O campo "${label}" deve ter no máximo 3 dígitos (0 a 999).`)
      invalidInputs.push(input)
    }
  }

  // Se há campos vazios, não faz sentido comparar valores
  if (messages.length) {
    showErrors(messages, invalidInputs)
    return false
  }

  const qty = Number(numbers.value)
  const min = Number(from.value)
  const max = Number(to.value)

  // 2. Intervalo coerente
  if (min > max) {
    messages.push(`O valor "De" (${min}) não pode ser maior que o valor "Até" (${max}).`)
    invalidInputs.push(from, to)
  }

  // 3. Sem repetição: quantidade não pode exceder o intervalo
  if (repeat.checked && min <= max) {
    const rangeSize = max - min + 1
    if (qty > rangeSize) {
      messages.push(
        `Com "Não repetir número" marcado, não é possível sortear ${qty} número(s) em um intervalo de apenas ${rangeSize}.`
      )
      invalidInputs.push(numbers)
    }
  }

  if (messages.length) {
    showErrors(messages, invalidInputs)
    return false
  }

  return true
}

function drawNumbers(qty, min, max, allowRepeat) {
  const drawn = []

  if (allowRepeat) {
    // Pode repetir: cada número é sorteado de forma independente
    for (let i = 0; i < qty; i++) {
      drawn.push(Math.floor(Math.random() * (max - min + 1)) + min)
    }
  } else {
    // Não pode repetir: sorteia sem reposição (Fisher-Yates parcial)
    const pool = []
    for (let n = min; n <= max; n++) pool.push(n)

    for (let i = 0; i < qty; i++) {
      const index = Math.floor(Math.random() * pool.length)
      drawn.push(pool[index])
      pool.splice(index, 1) // remove o número sorteado do "saco"
    }
  }

  return drawn
}

function renderResults(drawn) {
  const content = document.querySelector(".result-content")
  content.innerHTML = "" // limpa resultados anteriores
  result.classList.remove("hidden")
  form.classList.add("hidden")

  const DELAY = 3000 // ms entre cada número (sua animação dura ~2.1s)

  renderController?.abort() // cancela pendências anteriores
  renderController = new AbortController()
  const { signal } = renderController

  drawn.forEach((num, index) => {
    setTimeout(() => {
    // const id = setTimeout(() => {
      if (signal.aborted) return
      // 1. FIRST: guarda posição atual de cada número já na tela
      const previous = new Map()
      content.querySelectorAll("p").forEach((p) => {
        previous.set(p, p.getBoundingClientRect().left)
      })

      // 2. insere o novo número
      const p = document.createElement("p")
      p.textContent = num
      content.appendChild(p)

      // 3. INVERT + PLAY: anima o deslocamento de cada elemento
      content.querySelectorAll("p").forEach((el) => {
        const oldLeft = previous.get(el) ?? el.getBoundingClientRect().left + 120
        const delta = oldLeft - el.getBoundingClientRect().left

        if (delta !== 0) {
          el.animate(
            [{ transform: `translateX(${delta}px)` }, { transform: "translateX(0)" }],
            { duration: 400, easing: "cubic-bezier(0.28, 0.84, 0.42, 1)" }
          )
        }
      })
    }, index * DELAY)
    // timeoutIds.push(id)
  })

  // mostra o botão depois do último número + duração da animação (2.1s)
  setTimeout(() => {
    if (signal.aborted) return
    btnTryAgain.classList.remove("hidden")
    btnTryAgain.classList.add("show")
  }, drawn.length * DELAY)

  // drawn.forEach((num, index) => {
  //   setTimeout(() => {
  //     const p = document.createElement("p")
  //     p.textContent = num
  //     content.appendChild(p)
  //   }, index * DELAY)
  // })

}


// Bloqueio em tempo real para digitar somente números inteiros positivos de até 3 dígitos
;[numbers, from, to].forEach((input) => {
  input.addEventListener("input", () => {
    // remove tudo que não é dígito
    input.value = input.value.replace(/\D/g, "").slice(0, 3)
  })
})


form.addEventListener("submit", (event) => {
  event.preventDefault()

  if (!validateForm()) return

  // ... lógica do sorteio aqui
  const qty = Number(numbers.value)
  const min = Number(from.value)
  const max = Number(to.value)

  // repeat.checked = "Não repetir número" está marcado → NÃO pode repetir
  const drawn = drawNumbers(qty, min, max, !repeat.checked)

  renderResults(drawn)
})

btnTryAgain.addEventListener("click", () => {
  // cancela todos os números que ainda não apareceram
  // timeoutIds.forEach((id) => clearTimeout(id))
  // timeoutIds = []

  renderController?.abort()
  result.classList.add("hidden")
  form.classList.remove("hidden")

  // reseta o botão para o próximo sorteio
  btnTryAgain.classList.remove("show")
  btnTryAgain.classList.add("hidden")
})