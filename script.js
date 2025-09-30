document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTOS DO DOM ---
  const connectButton = document.getElementById('connectButton');
  const flowRateSpan = document.getElementById('flowRate');
  const totalVolumeSpan = document.getElementById('totalVolume');
  const historyTableBody = document.getElementById('historyTableBody');
  const ctx = document.getElementById('flowChart').getContext('2d');

  // --- ESTADO DA APLICAÇÃO ---
  let port;
  let reader;
  let lineBuffer = '';
  const MAX_DATA_POINTS_CHART = 60;
  let historyData = []; // Apenas para a sessão atual

  // --- GRÁFICO (CHART.JS) ---
  const flowChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Fluxo (L/min)',
        data: [],
        borderColor: 'rgba(0, 123, 255, 1)',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, title: { display: true, text: 'L/min' } }, x: { ticks: { display: false } } },
      animation: { duration: 0 }, // Desativa animação para feeling mais "real-time"
      plugins: { legend: { display: false } }
    }
  });

  // --- RENDERIZAÇÃO DA UI ---
  const handleNewData = (data) => {
    if (!data || typeof data.flow === 'undefined' || typeof data.totalVolume === 'undefined') {
      return; // Ignora dados malformados
    }

    const { flow, totalVolume } = data;
    const timestamp = new Date();

    // 1. Atualiza os cards de resumo
    flowRateSpan.textContent = flow.toFixed(2);
    totalVolumeSpan.textContent = totalVolume.toFixed(2);

    // 2. Adiciona ao histórico da sessão e atualiza a tabela
    const newEntry = { flow, totalVolume, timestamp };
    historyData.unshift(newEntry); // Adiciona no início do array

    const row = historyTableBody.insertRow(0);
    row.insertCell(0).textContent = timestamp.toLocaleString();
    row.insertCell(1).textContent = flow.toFixed(2);
    row.insertCell(2).textContent = totalVolume.toFixed(2);

    // 3. Atualiza o gráfico
    const chart = flowChart.data;
    chart.labels.push(timestamp.toLocaleTimeString());
    chart.datasets[0].data.push(flow);

    // Limita a quantidade de pontos no gráfico
    if (chart.labels.length > MAX_DATA_POINTS_CHART) {
      chart.labels.shift();
      chart.datasets[0].data.shift();
    }
    flowChart.update();
  };

  // --- LÓGICA DE CONEXÃO SERIAL ---
  const connect = async () => {
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      connectButton.textContent = 'Desconectar';
      connectButton.style.backgroundColor = '#28a745';
      
      // Limpa dados da sessão anterior ao conectar
      historyData = [];
      historyTableBody.innerHTML = '';

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      reader = textDecoder.readable.getReader();
      readLoop();
    } catch (error) {
      alert(`Erro ao conectar: ${error.message}`);
    }
  };

  const disconnect = async () => {
    if (reader) {
      await reader.cancel();
      reader = null;
    }
    if (port) {
      await port.close();
      port = null;
    }
    connectButton.textContent = 'Conectar ao Arduino';
    connectButton.style.backgroundColor = '#007bff';
  };

  const readLoop = async () => {
    while (true) {
      try {
        const { value, done } = await reader.read();
        if (done) break;
        
        lineBuffer += value;
        let lines = lineBuffer.split('\n');
        lineBuffer = lines.pop(); // Guarda a linha incompleta, se houver

        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            try {
              const jsonData = JSON.parse(trimmedLine);
              handleNewData(jsonData);
            } catch (e) {
              console.warn('Ignorando linha de serial malformada (não-JSON):', trimmedLine);
            }
          }
        });
      } catch (error) {
        console.error('Erro na leitura serial:', error);
        await disconnect();
        break;
      }
    }
  };

  // --- EVENT LISTENERS ---
  if (!('serial' in navigator)) {
    alert('Web Serial API não suportada. Use Chrome ou Edge.');
    connectButton.disabled = true;
  }

  connectButton.addEventListener('click', () => port ? disconnect() : connect());

});
