const dispatchText = document.getElementById("dispatchText");
const promptExtra = document.getElementById("promptExtra");
const generateButton = document.getElementById("generateButton");
const openOptionsButton = document.getElementById("openOptionsButton");
const statusMessage = document.getElementById("statusMessage");
const resultSection = document.getElementById("resultSection");
const responseTextEl = document.getElementById("responseText");
const useResponseButton = document.getElementById("useResponseButton");
const defaultUseResponseLabel = useResponseButton.textContent;

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

async function applyResponseToPage(responseText) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error("Não foi possível encontrar a aba do despacho aberta.");
  }

  let injectionResults;

  try {
    injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        const ckeditor = window.CKEDITOR;

        if (!ckeditor || !ckeditor.instances) {
          return { success: false, error: "CKEditor não encontrado na página atual." };
        }

        const escapeHtml = (value) =>
          value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const findEditableEditor = () => {
          return Object.values(ckeditor.instances).find((instance) => !instance.readOnly) || null;
        };

        const editor = ckeditor.instances.txaEditor_506 || findEditableEditor();

        if (!editor) {
          return { success: false, error: "Editor editável do despacho não foi localizado." };
        }

        const trimmed = text.trim();

        if (!trimmed) {
          editor.setData("");
          if (typeof editor.fire === "function") {
            editor.fire("change");
          }
          return { success: true };
        }

        const paragraphs = trimmed
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean);

        const html = (paragraphs.length > 0 ? paragraphs : [trimmed])
          .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
          .join("");

        editor.setData(html, {
          callback: () => {
            try {
              editor.focus();
            } catch (focusError) {
              console.debug("Não foi possível focar o editor do SEI", focusError);
            }
            if (typeof editor.fire === "function") {
              editor.fire("change");
            }
          }
        });

        return { success: true };
      },
      args: [responseText]
    });
  } catch (error) {
    throw new Error("Não foi possível aplicar o texto automaticamente nesta página.");
  }

  const [injectionResult] = injectionResults || [];

  if (!injectionResult || !injectionResult.result?.success) {
    const errorMessage = injectionResult?.result?.error || "Não foi possível inserir o texto na página do SEI.";
    throw new Error(errorMessage);
  }
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
    setStatus("Resposta gerada com sucesso! Revise e aplique no despacho.");

    useResponseButton.onclick = async () => {
      useResponseButton.disabled = true;
      useResponseButton.textContent = "Aplicando...";
      setStatus("Inserindo a resposta no SEI...");

      try {
        await applyResponseToPage(responseText);
        dispatchText.value = "";
        promptExtra.value = "";
        resultSection.hidden = true;
        setStatus("Resposta inserida no despacho com sucesso!");
      } catch (error) {
        console.error(error);
        setStatus(`Erro ao aplicar resposta: ${error.message}`, true);
      } finally {
        useResponseButton.disabled = false;
        useResponseButton.textContent = defaultUseResponseLabel;
      }
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
