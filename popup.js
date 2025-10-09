const dispatchText = document.getElementById("dispatchText");
const promptExtra = document.getElementById("promptExtra");
const generateButton = document.getElementById("generateButton");
const openOptionsButton = document.getElementById("openOptionsButton");
const statusMessage = document.getElementById("statusMessage");
const resultSection = document.getElementById("resultSection");
const responseTextEl = document.getElementById("responseText");
const useResponseButton = document.getElementById("useResponseButton");

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        apiKey: "",
        model: "gpt-3.5-turbo",
        temperature: 0.2
      },
      resolve
    );
  });
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b42318" : "inherit";
}

function toggleLoading(isLoading) {
  generateButton.disabled = isLoading;
  generateButton.textContent = isLoading ? "Gerando..." : "Gerar resposta";
}

async function callOpenAi({ apiKey, model, temperature }, despacho, extra) {
  const messages = [
    {
      role: "system",
      content:
        "Você é um assistente especializado em redigir respostas objetivas e respeitosas para despachos administrativos no contexto do SEI."
    },
    {
      role: "user",
      content: `Escreva uma resposta bem estruturada e profissional para o despacho a seguir.\n\nDespacho original:\n${despacho}\n\nInformações adicionais:\n${extra || "Nenhuma."}`
    }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature,
      messages
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const message = details?.error?.message || response.statusText;
    throw new Error(message);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Não foi possível obter uma resposta da IA.");
  }

  return content;
}

async function handleGenerate() {
  const despacho = dispatchText.value.trim();
  const extra = promptExtra.value.trim();

  if (!despacho) {
    setStatus("Cole o texto do despacho antes de gerar a resposta.", true);
    return;
  }

  const settings = await loadSettings();

  if (!settings.apiKey) {
    setStatus("Configure sua chave de API nas opções da extensão.", true);
    chrome.runtime.openOptionsPage();
    return;
  }

  try {
    toggleLoading(true);
    setStatus("Chamando a IA generativa...");
    resultSection.hidden = true;

    const responseText = await callOpenAi(settings, despacho, extra);

    responseTextEl.textContent = responseText;
    resultSection.hidden = false;
    setStatus("Resposta gerada com sucesso!");

    useResponseButton.onclick = () => {
      dispatchText.value = responseText;
      promptExtra.value = "";
      resultSection.hidden = true;
      setStatus("Resposta aplicada ao despacho.");
    };
  } catch (error) {
    console.error(error);
    setStatus(`Erro ao gerar resposta: ${error.message}`, true);
  } finally {
    toggleLoading(false);
  }
}

generateButton.addEventListener("click", () => {
  handleGenerate();
});

if (openOptionsButton) {
  openOptionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

[dispatchText, promptExtra].forEach((element) => {
  element.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleGenerate();
    }
  });
});
