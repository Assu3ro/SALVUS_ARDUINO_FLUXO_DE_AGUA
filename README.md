# SALVUS_ARDUINO_FLUXO_DE_AGUA
Monitor de Fluxo de Água com Arduino e Dashboard - Teste Salvus
Este projeto apresenta uma solução completa para monitorar um vazão de água em tempo real utilizando um sensor de fluxo YF-S201 (no lugar de um analógico), um Arduino Uno e uma interface web como dashboard. O Arduino é responsável por toda a lógica, tornando-o uma fonte central de dados, enquanto a interface web atua como um painel de visualização dinâmica.


➤ Principais Funcionalidades
💧 Monitoramento em Tempo Real: Visualiza a vazão instantânea (Litros/minuto) em um cartão e em um gráfico de linha.

📊 Cálculo de Volume Acumulado: O Arduino integra um vazão ao longo do tempo para calcular o volume total de água que passou pelo sensor.

🔘 Reset Físico: Um botão físico conectado ao Arduino permite zerar o contador de volume acumulado a qualquer momento.

💻 Dashboard Web Interativo: Uma página web, usando uma API Web Serial, conecta-se diretamente ao Arduino para exibir os dados sem a necessidade de um complexo backend.

⚙️ Comunicação Robusta: A comunicação entre o Arduino e a interface é feita através de um protocolo JSON bem definido, garantindo a integridade dos dados.

🛠️ Como Funciona (Arquitetura)
O sistema opera em um fluxo de dados unidirecional e simples:



Sensor (YF-S201): Gera pulsos elétricos fornecidos ao fluxo de água.

Arduino Uno:
-Captura estes pulsos usando uma interrupção de hardware para máxima precisão.
-Calcula a vazão instantânea (L/min) a partir da frequência dos pulsos.
-Integre um vazão a cada segundo para obter o volume total acumulado.
-Verifique continuamente se o botão de reset foi pressionado.
-Envia os dados de vazão e volume em formato JSON pela porta serial a cada segundo.

Interface Web (Navegador):
-Utilize uma API Web Serial para se conectar à porta serial do Arduino.
-Lê as strings JSON enviadas pelo Arduino.
-Faz o "parse" do JSON e atualiza os elementos da UI (cards, gráficos e tabela) com os novos dados.


🔩 Hardware Necessário
Componentes
Arduino Uno (ou similar)	O cérebro do projeto.
Sensor de Fluxo YF-S201	Mede o fluxo de água.
Botão de pressão (Botão)	Para zerar o contador de volume.
Placa de ensaio (Protoboard)	Para facilitar as conexões.
Jumpers (Fios)	Para conectar os componentes.


🚀 Configuração e Uso
1. Preparar o Arduino
Instale um Arduino IDE: Se ainda não tiver, baixe e instale um Arduino IDE .
Instale o Driver (se necessário): Se você estiver usando uma placa Arduino "clone" no macOS ou Windows, talvez seja necessário instalar o driver CH340 .
Carregue o Código:
Abra o arquivo arduino_code/sensor_reader/sensor_reader.inono Arduino IDE.
Conecte o Arduino ao computador.
Selecione a placa ("Arduino Uno") e a porta correta em Ferramentas > Placae Ferramentas > Porta.
Clique no botão "Carregar" (seta para a direita).
2. Iniciar uma Interface Web
Uma API Web Serial exige que uma página seja servida a partir de um ambiente seguro ( localhostou https).

Abra um terminal ou prompt de comando.
Navegue até a pastaweb_interface do projeto:
cd /caminho/para/o/projeto/web_interface
Inicie um servidor local simples com Python:
python -m http.server
Se você não tiver Python, pode usar a extensão "Live Server" no VS Code.
3. Visualizar os Dados
Abra o navegador: Use o Google Chrome ou Microsoft Edge (outros navegadores não podem ter suporte para Web Serial API).
Acesse o endereço: Digite http://localhost:8000na barra de endereço.
Conecte-se ao Arduino:
Clique no botão "Conectar ao Arduino" .
Uma janela pop-up aparecerá. Selecione a porta serial correspondente ao seu Arduino e clique em "Conectar".
Pronto! Os dados começarão a ser exibidos em tempo real. Pressione o botão físico para ver o "Volume Total Acumulado" ser zerado.
🔬 Detalhes Técnicos do Código
Arduino ( sensor_reader.ino)
O código do Arduino é o coração do sistema. Ele é responsável por todos os cálculos.

Cálculo de Vazão e Volume: A cada segundo, o código calcula a vazão a partir dos pulsos contados pela interrupção e, em seguida, calcula o incremento de volume, somando-o ao total.

// DENTRO DO LOOP QUE RODA A CADA 1 SEGUNDO

// Calcula a vazão instantânea (L/min)
float frequency = currentPulseCount; // Frequência em Hz (pulsos por segundo)
flowRate = frequency / calibrationFactor;

// Calcula o volume e integra (soma) ao total
// Vazão (L/min) / 60 = Vazão (L/seg). Como o intervalo é de 1 seg, o volume é a própria vazão em L/s.
float volumeIncrement = flowRate / 60.0;
totalVolume += volumeIncrement;
Detecção do Botão com Debounce: Para evitar que um único abertura seja contado várias vezes, uma lógica de "debounce" baseada em millis()é utilizada.

void handleResetButton() {
  int reading = digitalRead(resetButtonPin);

  // Se o botão foi pressionado (LOW) e o tempo de debounce passou
  if (reading == LOW && (millis() - lastDebounceTime) > debounceDelay) {
    Serial.println("Botão de reset pressionado. Zerando volume.");
    totalVolume = 0.0;
    lastDebounceTime = millis();
  }
}
JavaScript ( script.js)
O JavaScript é focado em se conectar à porta serial e renderizar os dados recebidos.

e "Parse" do JSON: O loop de leitura aguarda por linhas completas ( \n), tenta fazer o "parse" da string como JSON e, em caso de sucesso, chama a função para atualizar a interface.

const readLoop = async () => {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    lineBuffer += value;
    let lines = lineBuffer.split('\n');
    lineBuffer = lines.pop(); // Guarda a linha incompleta, se houver

    lines.forEach(line => {
      if (line.trim()) {
        try {
          const jsonData = JSON.parse(line.trim());
          handleNewData(jsonData);
        } catch (e) {
          console.warn('Ignorando linha de serial malformada (não-JSON):', line.trim());
        }
      }
    });
  }
};
📡 Protocolo de Comunicação (JSON)
A comunicação entre o Arduino e a interface web utiliza um formato JSON segundo simples e eficiente, enviado a cada vez.

Estrutura:

{
  "flow": 5.25,
  "totalVolume": 123.45
}
flow(Número): Representa a vazão instantânea em Litros por Minuto (L/min).
totalVolume(Número): Representa o volume total acumulado em Litros (L) desde o último reset.
