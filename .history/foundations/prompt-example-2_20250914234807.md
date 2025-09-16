Ayúdame a crear un plan llamado "planvoz.md" donde integremos un feature de registro de gastos por comando de voz en mi aplicación Next.js de personal finance tracker existente, utilizando la API de Gemini Flash para procesamiento inteligente de audio y categorización automática.

## Objetivo
Permitir a los usuarios registrar gastos mediante comandos de voz naturales como:
- "Gasté 25 pesos en tacos"
- "Pagué 500 en gasolina"
- "Compré medicina por 180 pesos"
- "Cena en restaurante 350"

El sistema debe extraer **monto** y **concepto**, mientras que la **categorización será automática** usando IA.

## Flujo de Funcionalidad Esperado
### 1. Captura de Audio con feedback de "Procesando..." mientras se analiza

### 2. Procesamiento con Gemini
- Enviar archivo de audio directamente a Gemini Flash 
- Gemini realizará transcripción automática y extracción de datos en un solo paso
- Prompt para Gemini que transcriba, extraiga monto, concepto, y sugiera categoría
- Manejo de errores si no se detecta información válida en el audio

### 3. Confirmación y Registro
- Mostrar modal de confirmación con datos extraídos
- Usuario puede editar antes de confirmar
- Feedback de éxito

## Especificaciones Técnicas

### Integración con Gemini Flash, a continuación esta el código exacto de la documentación del API de Gemini Flash

Biblioteca: @google/genai
Repositorio de GitHub: googleapis/js-genai
Instalación: npm install @google/genai

import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });

async function main() {
  const myfile = await ai.files.upload({
    file: "path/to/sample.mp3",
    config: { mimeType: "audio/mp3" },
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([
      createPartFromUri(myfile.uri, myfile.mimeType),
      "Describe this audio clip",
    ]),
  });
  console.log(response.text);
}

await main();

API Integration
- Soporte completo de formatos**: MP3, WAV, M4A, WebM, OGG
- Validación dinámica basada en MIME types del navegador
- Route Handler /api/process-voice-audio para subir audio y llamar Gemini
- File Upload temporal para procesar audio antes de enviarlo a Gemini
- Variables de entorno para API key de Gemini
- Timeout handling para procesamiento de audio y respuestas de IA

### Prompt Engineering para Gemini
Necesito un prompt robusto que:
- Extraiga monto en números (sin símbolos de moneda)
- Identifique concepto/descripción del gasto
- Sugiera categoría más apropiada de las disponibles
- Maneje variaciones en español mexicano
- Retorne JSON estructurado para fácil parsingz