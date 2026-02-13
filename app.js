import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = typeof window !== 'undefined' && window.SUPABASE_URL ? window.SUPABASE_URL : '';
const SUPABASE_ANON_KEY = typeof window !== 'undefined' && window.SUPABASE_ANON_KEY ? window.SUPABASE_ANON_KEY : '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

(function () {
  'use strict';

  const META_LUCRO = 7000;
  const META_DATA = '2026-08-10';
  const UNIDADES_POR_RECEITA = 12;
  const MAO_DE_OBRA = 15;
  const EMBALAGEM_POR_UNIDADE = 0.66;
  const PRECO_VENDA = 12;

  const STORAGE_TEMA = 'bolo_tema';

  const TEMAS_VALIDOS = ['soft', 'lavanda', 'mint', 'ceu', 'caramelo'];
  const CORES_GRAFICO = {
    soft: { bar: 'rgba(232, 180, 188, 0.8)', barBorder: 'rgba(212, 149, 154, 1)', doughnut: ['#b8d4c8', '#e8b4bc'] },
    lavanda: { bar: 'rgba(196, 181, 224, 0.8)', barBorder: 'rgba(168, 152, 201, 1)', doughnut: ['#c4b5e0', '#e8e0f0'] },
    mint: { bar: 'rgba(245, 196, 168, 0.8)', barBorder: 'rgba(232, 168, 124, 1)', doughnut: ['#a8d5c4', '#f5c4a8'] },
    ceu: { bar: 'rgba(148, 184, 212, 0.8)', barBorder: 'rgba(122, 159, 196, 1)', doughnut: ['#b8d4e0', '#94b8d4'] },
    caramelo: { bar: 'rgba(212, 184, 160, 0.8)', barBorder: 'rgba(196, 160, 128, 1)', doughnut: ['#d8c8b8', '#d4b8a0'] },
  };

  const INSUMOS_INICIAIS = {
    massa: [
      { nome: 'Ovos', tipo: 'unidade', quantidade: 3, preco: 0.015 }, // R$ por unidade
      { nome: 'Açúcar refinado', tipo: 'kg', quantidade: 0.24, preco: 5 },
      { nome: 'Leite', tipo: 'kg', quantidade: 0.12, preco: 6 },
      { nome: 'Óleo', tipo: 'kg', quantidade: 0.125, preco: 10 },
      { nome: 'Chocolate em pó', tipo: 'kg', quantidade: 0.1, preco: 55 },
      { nome: 'Farinha de trigo', tipo: 'kg', quantidade: 0.36, preco: 5.5 },
      { nome: 'Bicarbonato de sódio', tipo: 'kg', quantidade: 0.005, preco: 40 },
      { nome: 'Fermento em pó', tipo: 'kg', quantidade: 0.015, preco: 30 },
    ],
    recheio: [
      { nome: 'Leite condensado', tipo: 'unidade', quantidade: 1.5, preco: 8 },
      { nome: 'Chocolate em pó', tipo: 'kg', quantidade: 0.06, preco: 55 },
      { nome: 'Manteiga', tipo: 'kg', quantidade: 0.015, preco: 72 },
    ],
    cobertura: [
      { nome: 'Leite condensado', tipo: 'unidade', quantidade: 1, preco: 8 },
      { nome: 'Chocolate em pó', tipo: 'kg', quantidade: 0.06, preco: 55 },
      { nome: 'Manteiga', tipo: 'kg', quantidade: 0.01, preco: 72 },
      // Granulado desconsiderado no custo (conforme pedido)
    ],
  };

  let insumos = JSON.parse(JSON.stringify(INSUMOS_INICIAIS));
  let vendas = [];
  let receitasProduzidas = 0;

  function getTemaAtual() {
    const salvo = localStorage.getItem(STORAGE_TEMA);
    return TEMAS_VALIDOS.includes(salvo) ? salvo : 'soft';
  }

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem(STORAGE_TEMA, tema);
    if (window.chartVendas && window.chartEquilibrio) {
      atualizarGraficos();
    }
  }

  async function loadFromSupabase() {
    if (!supabase) {
      console.warn('Supabase não configurado. Copie config.example.js para config.js e preencha as chaves.');
      return;
    }
    const [vendasRes, configRes] = await Promise.all([
      supabase.from('vendas').select('id, quantidade, sabor, data').order('data', { ascending: true }),
      supabase.from('config').select('receitas_produzidas, insumos').eq('id', 1).single(),
    ]);
    if (vendasRes.data && Array.isArray(vendasRes.data)) {
      vendas = vendasRes.data.map((r) => ({
        id: r.id,
        quantidade: r.quantidade,
        sabor: r.sabor || 'Não informado',
        data: r.data,
      }));
    }
    if (configRes.data) {
      receitasProduzidas = configRes.data.receitas_produzidas ?? 0;
      if (configRes.data.insumos && configRes.data.insumos.massa) {
        insumos = configRes.data.insumos;
      }
    }
  }

  async function saveVendaToSupabase(quantidade, sabor, data) {
    if (!supabase) throw new Error('Supabase não configurado. Verifique config.js.');
    const payload = {
      quantidade: Number(quantidade) || 1,
      sabor: String(sabor || 'Não informado').trim(),
      data: String(data || '').trim() || new Date().toISOString().slice(0, 10),
    };
    const { data: rows, error } = await supabase
      .from('vendas')
      .insert(payload)
      .select('id');
    if (error) throw error;
    const id = rows && rows[0] ? rows[0].id : null;
    if (!id) throw new Error('Venda registrada mas ID não retornado.');
    return id;
  }

  async function saveConfigToSupabase() {
    if (!supabase) return;
    const { error } = await supabase.from('config').update({
      receitas_produzidas: receitasProduzidas,
      insumos,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    if (error) throw error;
  }

  function custoComponente(itens) {
    return itens.reduce((acc, i) => {
      if (i.tipo === 'unidade') return acc + i.quantidade * i.preco;
      return acc + i.quantidade * i.preco;
    }, 0);
  }

  function getCustoMassa() {
    return custoComponente(insumos.massa);
  }
  function getCustoRecheio() {
    return custoComponente(insumos.recheio);
  }
  function getCustoCobertura() {
    return custoComponente(insumos.cobertura);
  }

  function getCustoTotalReceita() {
    return getCustoMassa() + getCustoRecheio() + getCustoCobertura() + MAO_DE_OBRA;
  }

  function getCustoPorUnidade() {
    return getCustoTotalReceita() / UNIDADES_POR_RECEITA + EMBALAGEM_POR_UNIDADE;
  }

  function getLucroPorUnidade() {
    return PRECO_VENDA - getCustoPorUnidade();
  }

  function parseDataLocal(dataStr) {
    if (!dataStr) return null;
    const parts = String(dataStr).split('-').map(Number);
    if (parts.length !== 3) return new Date(dataStr);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function getRangeFiltro() {
    const sel = document.getElementById('filterPeriod').value;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let inicio, fim;
    if (sel === 'hoje') {
      inicio = new Date(hoje);
      fim = new Date(hoje);
      fim.setHours(23, 59, 59, 999);
    } else if (sel === '7dias') {
      fim = new Date(hoje);
      fim.setHours(23, 59, 59, 999);
      inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
    } else if (sel === 'mes') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje);
      fim.setHours(23, 59, 59, 999);
    } else {
      const from = document.getElementById('dateFrom').value;
      const to = document.getElementById('dateTo').value;
      if (!from || !to) return { inicio: null, fim: null };
      inicio = parseDataLocal(from);
      fim = parseDataLocal(to);
      if (!inicio || !fim) return { inicio: null, fim: null };
      if (fim < inicio) fim = new Date(inicio.getTime());
      fim.setHours(23, 59, 59, 999);
    }
    return { inicio, fim };
  }

  function filtrarVendas(vendasList) {
    const { inicio, fim } = getRangeFiltro();
    if (!inicio || !fim) return [];
    return vendasList.filter((v) => {
      const d = parseDataLocal(v.data);
      if (!d) return false;
      d.setHours(0, 0, 0, 0);
      return d >= inicio && d <= fim;
    });
  }

  function toDateOnly(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function vendasHoje() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);
    return vendas.filter((v) => {
      const d = parseDataLocal(v.data);
      if (!d) return false;
      return d >= hoje && d <= fimHoje;
    });
  }

  function vendasEstaSemana() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diaSemana = hoje.getDay();
    const domingo = new Date(hoje);
    domingo.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1) - 1);
    domingo.setHours(0, 0, 0, 0);
    const segunda = new Date(domingo);
    segunda.setDate(domingo.getDate() + 1);
    const fimHoje = new Date();
    fimHoje.setHours(23, 59, 59, 999);
    return vendas.filter((v) => {
      const d = parseDataLocal(v.data);
      if (!d) return false;
      return d >= segunda && d <= fimHoje;
    });
  }

  function totalUnidades(vendasList) {
    return vendasList.reduce((acc, v) => acc + (v.quantidade || 0), 0);
  }

  function atualizarMetricas() {
    const list = filtrarVendas(vendas);
    const unidades = totalUnidades(list);
    const faturamento = unidades * PRECO_VENDA;
    const custoReceitas = Math.ceil(unidades / UNIDADES_POR_RECEITA) * getCustoTotalReceita();
    const custoEmbalagem = unidades * EMBALAGEM_POR_UNIDADE;
    const gastos = custoReceitas + custoEmbalagem;
    const lucro = faturamento - gastos;
    const investimento = gastos;
    const roi = investimento > 0 ? ((lucro / investimento) * 100).toFixed(1) : '0';

    document.getElementById('faturamento').textContent = formatBrl(faturamento);
    document.getElementById('lucro').textContent = formatBrl(lucro);
    document.getElementById('gastos').textContent = formatBrl(gastos);
    document.getElementById('roi').textContent = roi + '%';
  }

  function lucroAcumuladoTotal() {
    const unidades = totalUnidades(vendas);
    const faturamento = unidades * PRECO_VENDA;
    const custoReceitas = Math.ceil(unidades / UNIDADES_POR_RECEITA) * getCustoTotalReceita();
    const custoEmbalagem = unidades * EMBALAGEM_POR_UNIDADE;
    return faturamento - custoReceitas - custoEmbalagem;
  }

  function atualizarMetas() {
    const lucroAtual = lucroAcumuladoTotal();
    const percent = Math.min(100, (lucroAtual / META_LUCRO) * 100);
    const faltaReais = Math.max(0, META_LUCRO - lucroAtual);

    document.getElementById('progress7k').style.width = Math.max(0, percent) + '%';
    document.getElementById('percent7k').textContent = percent.toFixed(0);
    const elLucroJa = document.getElementById('lucroJaVendido');
    if (elLucroJa) {
      elLucroJa.textContent = formatBrl(lucroAtual);
      elLucroJa.classList.toggle('negative', lucroAtual < 0);
    }
    const elFaltaReais = document.getElementById('faltaMetaReais');
    if (elFaltaReais) elFaltaReais.textContent = formatBrl(faltaReais);
    const elPercentMeta = document.getElementById('percentMeta');
    if (elPercentMeta) {
      elPercentMeta.textContent = percent.toFixed(1) + '%';
      elPercentMeta.classList.toggle('negative', percent < 0);
    }

    const lucroUn = getLucroPorUnidade();
    const unidadesParaMetaTotal = lucroUn > 0 ? META_LUCRO / lucroUn : 0;
    const unidadesVendidasTotal = totalUnidades(vendas);
    const faltamVenderParaMeta = Math.max(0, Math.ceil(unidadesParaMetaTotal - unidadesVendidasTotal));
    const elFaltam = document.getElementById('faltamVenderMeta');
    if (elFaltam) elFaltam.textContent = faltamVenderParaMeta + ' potes';

    const dataMeta = parseDataLocal(META_DATA) || new Date(META_DATA);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataMeta.setHours(0, 0, 0, 0);
    const diasRestantes = Math.max(0, Math.ceil((dataMeta - hoje) / (1000 * 60 * 60 * 24)));
    const metaDiariaUn = diasRestantes > 0 ? unidadesParaMetaTotal / diasRestantes : 0;
    const metaSemanalUn = metaDiariaUn * 7;

    const vendasDia = vendasHoje();
    const vendasSemana = vendasEstaSemana();
    const unHoje = totalUnidades(vendasDia);
    const unSemana = totalUnidades(vendasSemana);

    const progressDiaria = metaDiariaUn > 0 ? Math.min(100, (unHoje / metaDiariaUn) * 100) : 0;
    const progressSemanal = metaSemanalUn > 0 ? Math.min(100, (unSemana / metaSemanalUn) * 100) : 0;

    document.getElementById('progressDiaria').style.width = progressDiaria + '%';
    document.getElementById('progressSemanal').style.width = progressSemanal + '%';
    document.getElementById('labelMetaDiaria').textContent =
      unHoje.toFixed(0) + ' / ' + Math.ceil(metaDiariaUn) + ' vendidos (hoje)';
    document.getElementById('labelMetaSemanal').textContent =
      unSemana.toFixed(0) + ' / ' + Math.ceil(metaSemanalUn) + ' vendidos (semana)';

    const cardDiaria = document.getElementById('cardMetaDiaria');
    const cardSemanal = document.getElementById('cardMetaSemanal');
    cardDiaria.classList.remove('score-success', 'score-warning');
    cardSemanal.classList.remove('score-success', 'score-warning');

    let msgDiaria = cardDiaria.querySelector('.attention-msg');
    if (metaDiariaUn > 0) {
      if (unHoje >= metaDiariaUn) {
        cardDiaria.classList.add('score-success');
        if (!msgDiaria) {
          msgDiaria = document.createElement('p');
          msgDiaria.className = 'attention-msg';
          cardDiaria.appendChild(msgDiaria);
        }
        msgDiaria.textContent = '🎉 Meta batida!';
      } else {
        cardDiaria.classList.add('score-warning');
        if (!msgDiaria) {
          msgDiaria = document.createElement('p');
          msgDiaria.className = 'attention-msg';
          cardDiaria.appendChild(msgDiaria);
        }
        msgDiaria.textContent = 'Atenção: Hora de ofertar!';
      }
    } else if (msgDiaria) msgDiaria.textContent = '';

    if (metaSemanalUn > 0 && unSemana >= metaSemanalUn) {
      cardSemanal.classList.add('score-success');
    } else if (metaSemanalUn > 0) {
      cardSemanal.classList.add('score-warning');
    }
  }

  function formatBrl(n) {
    return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function atualizarEstoque() {
    const prod = parseInt(document.getElementById('receitasProduzidas').value || 0, 10);
    const potesProd = prod * UNIDADES_POR_RECEITA;
    const list = filtrarVendas(vendas);
    const vendidos = totalUnidades(list);
    const vendidosTotal = totalUnidades(vendas);
    const estoque = Math.max(0, potesProd - vendidosTotal);

    document.getElementById('potesProduzidos').textContent = potesProd;
    document.getElementById('potesVendidos').textContent = vendidos;
    const elTotal = document.getElementById('potesVendidosTotal');
    if (elTotal) elTotal.textContent = vendidosTotal;
    document.getElementById('potesEstoque').textContent = estoque;
  }

  function atualizarInsumosUI() {
    const custoM = getCustoMassa();
    const custoR = getCustoRecheio();
    const custoC = getCustoCobertura();
    document.getElementById('custoMassa').textContent = custoM.toFixed(2);
    document.getElementById('custoRecheio').textContent = custoR.toFixed(2);
    document.getElementById('custoCobertura').textContent = custoC.toFixed(2);
    document.getElementById('custoTotalReceita').textContent = getCustoTotalReceita().toFixed(2);

    renderTabelaInsumos('tabelaMassa', insumos.massa);
    renderTabelaInsumos('tabelaRecheio', insumos.recheio);
    renderTabelaInsumos('tabelaCobertura', insumos.cobertura);
  }

  function renderTabelaInsumos(containerId, itens) {
    const container = document.getElementById(containerId);
    const tipoLabel = (t) => (t === 'unidade' ? 'R$ unidade' : 'R$ quilo');
    container.innerHTML =
      '<table><thead><tr><th>Ingrediente</th><th>Qtd</th><th>' +
      'Preço</th><th>Total</th></tr></thead><tbody></tbody></table>';
    const tbody = container.querySelector('tbody');
    itens.forEach((item, idx) => {
      const total = item.tipo === 'unidade' ? item.quantidade * item.preco : item.quantidade * item.preco;
      const tr = document.createElement('tr');
      const qtdDisplay = item.tipo === 'unidade' ? item.quantidade + ' un' : item.quantidade * 1000 + ' g';
      tr.innerHTML =
        '<td>' +
        item.nome +
        '</td><td>' +
        qtdDisplay +
        '</td><td><input type="number" step="0.01" min="0" value="' +
        item.preco +
        '" data-group="' +
        containerId +
        '" data-idx="' +
        idx +
        '"></td><td class="total-cell">' +
        total.toFixed(2) +
        '</td>';
      tbody.appendChild(tr);
      const input = tr.querySelector('input');
      input.addEventListener('input', function () {
        const val = parseFloat(this.value) || 0;
        const grupo = this.getAttribute('data-group');
        const i = parseInt(this.getAttribute('data-idx'), 10);
        const key = grupo === 'tabelaMassa' ? 'massa' : grupo === 'tabelaRecheio' ? 'recheio' : 'cobertura';
        insumos[key][i].preco = val;
        saveConfigToSupabase().catch((err) => console.error('Erro ao salvar insumos:', err));
        const item = insumos[key][i];
        const total = item.tipo === 'unidade' ? item.quantidade * val : item.quantidade * val;
        tr.querySelector('.total-cell').textContent = total.toFixed(2);
        document.getElementById('custoMassa').textContent = getCustoMassa().toFixed(2);
        document.getElementById('custoRecheio').textContent = getCustoRecheio().toFixed(2);
        document.getElementById('custoCobertura').textContent = getCustoCobertura().toFixed(2);
        document.getElementById('custoTotalReceita').textContent = getCustoTotalReceita().toFixed(2);
        atualizarMetricas();
        atualizarMetas();
        if (window.chartVendas) window.chartVendas.update('none');
        if (window.chartEquilibrio) window.chartEquilibrio.update('none');
      });
    });
  }

  let chartVendas, chartEquilibrio;

  function atualizarGraficos() {
    const list = filtrarVendas(vendas);
    const porDia = {};
    list.forEach((v) => {
      const key = v.data.slice(0, 10);
      porDia[key] = (porDia[key] || 0) + (v.quantidade || 0);
    });
    const labels = Object.keys(porDia).sort();
    const data = labels.map((k) => porDia[k]);

    const ctx = document.getElementById('chartVendas');
    if (!ctx) return;
    if (chartVendas) chartVendas.destroy();
    const cores = CORES_GRAFICO[getTemaAtual()] || CORES_GRAFICO.soft;
    chartVendas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Vendas (un)',
            data,
            backgroundColor: cores.bar,
            borderColor: cores.barBorder,
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#4a4a4a' } },
          x: { ticks: { color: '#4a4a4a', maxRotation: 45 } },
        },
      },
    });
    window.chartVendas = chartVendas;

    const custoReceita = getCustoTotalReceita();
    const custoUn = getCustoPorUnidade();
    const margemUn = PRECO_VENDA - custoUn;
    const listMes = vendas.filter((v) => {
      const d = parseDataLocal(v.data);
      if (!d) return false;
      const hoje = new Date();
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    });
    const vendidosMes = totalUnidades(listMes);
    const custoReceitasMes = Math.ceil(vendidosMes / UNIDADES_POR_RECEITA) * custoReceita;
    const custoEmbalagemMes = vendidosMes * EMBALAGEM_POR_UNIDADE;
    const custoTotalMes = custoReceitasMes + custoEmbalagemMes;
    const equilibrioUn = custoTotalMes > 0 && margemUn > 0 ? custoTotalMes / margemUn : 0;
    const faltaVender = Number.isFinite(equilibrioUn) ? Math.max(0, Math.ceil(equilibrioUn - vendidosMes)) : 0;

    const ctxEq = document.getElementById('chartEquilibrio');
    if (ctxEq) {
      if (chartEquilibrio) chartEquilibrio.destroy();
      const coresEq = CORES_GRAFICO[getTemaAtual()] || CORES_GRAFICO.soft;
      const dataVendidos = Number.isFinite(equilibrioUn) ? Math.min(vendidosMes, equilibrioUn) : vendidosMes;
      const dataFalta = Number.isFinite(equilibrioUn) ? faltaVender : 0;
      chartEquilibrio = new Chart(ctxEq, {
        type: 'doughnut',
        data: {
          labels: ['Vendidos no mês', 'Falta vender (equilíbrio)'],
          datasets: [
            {
              data: [dataVendidos, dataFalta],
              backgroundColor: coresEq.doughnut,
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { color: '#4a4a4a' } } },
        },
      });
      window.chartEquilibrio = chartEquilibrio;
    }

    const textEq = document.getElementById('textEquilibrio');
    if (textEq) {
      if (margemUn <= 0) textEq.textContent = 'Custo por unidade está maior que o preço de venda. Ajuste insumos ou preço.';
      else if (Number.isFinite(equilibrioUn) && vendidosMes >= equilibrioUn) textEq.textContent = 'Ponto de equilíbrio do mês já atingido.';
      else if (Number.isFinite(equilibrioUn)) textEq.textContent = 'Faltam vender ' + faltaVender + ' potes para pagar os custos do mês.';
      else textEq.textContent = 'Ponto de equilíbrio do mês já atingido.';
    }
  }

  document.getElementById('receitasProduzidas').value = receitasProduzidas;
  document.getElementById('receitasProduzidas').addEventListener('input', function () {
    receitasProduzidas = parseInt(this.value || 0, 10);
    saveConfigToSupabase().catch((err) => console.error('Erro ao salvar receitas produzidas:', err));
    atualizarEstoque();
  });

  document.getElementById('filterPeriod').addEventListener('change', function () {
    document.getElementById('customRange').classList.toggle('hidden', this.value !== 'personalizado');
    atualizarMetricas();
    atualizarEstoque();
    atualizarGraficos();
  });

  document.getElementById('dateFrom').addEventListener('change', function () {
    atualizarMetricas();
    atualizarEstoque();
    atualizarGraficos();
  });
  document.getElementById('dateTo').addEventListener('change', function () {
    atualizarMetricas();
    atualizarEstoque();
    atualizarGraficos();
  });

  document.getElementById('btnRegistrarVenda').addEventListener('click', function () {
    document.getElementById('modalVenda').classList.remove('hidden');
    document.getElementById('vendaData').value = new Date().toISOString().slice(0, 10);
  });

  document.getElementById('closeModalVenda').addEventListener('click', function () {
    document.getElementById('modalVenda').classList.add('hidden');
  });

  document.getElementById('modalVenda').addEventListener('click', function (e) {
    if (e.target === this) this.classList.add('hidden');
  });

  document.getElementById('formVenda').addEventListener('submit', async function (e) {
    e.preventDefault();
    const quantidade = parseInt(document.getElementById('vendaQuantidade').value, 10);
    const sabor = document.getElementById('vendaSabor').value.trim() || 'Não informado';
    const data = document.getElementById('vendaData').value;
    const btn = this.querySelector('button[type="submit"]');
    const btnText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Salvando…';
    try {
      const id = await saveVendaToSupabase(quantidade, sabor, data);
      vendas.push({ id, quantidade, sabor, data });
      vendas.sort((a, b) => (parseDataLocal(a.data) || 0) - (parseDataLocal(b.data) || 0));

      const list = document.getElementById('saboresList');
      if (sabor && !Array.from(list.options).some((o) => o.value === sabor)) {
        const opt = document.createElement('option');
        opt.value = sabor;
        list.appendChild(opt);
      }

      document.getElementById('modalVenda').classList.add('hidden');
      this.reset();
      document.getElementById('vendaData').value = new Date().toISOString().slice(0, 10);

      atualizarMetricas();
      atualizarMetas();
      atualizarEstoque();
      atualizarGraficos();
      atualizarDatalistSabores();
    } catch (err) {
      console.error('Erro ao registrar venda:', err);
      const msg = err && err.message ? err.message : String(err);
      alert('Não foi possível salvar a venda.\n\n' + msg + '\n\nAbra o Console (F12) para mais detalhes.');
    }
    btn.disabled = false;
    btn.textContent = btnText;
  });

  function atualizarDatalistSabores() {
    const sabores = [...new Set(vendas.map((v) => v.sabor).filter(Boolean))];
    const list = document.getElementById('saboresList');
    list.innerHTML = '';
    sabores.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      list.appendChild(opt);
    });
  }

  document.documentElement.setAttribute('data-theme', getTemaAtual());

  document.getElementById('btnTema').addEventListener('click', function (e) {
    e.stopPropagation();
    document.getElementById('themePicker').classList.toggle('hidden');
  });

  document.addEventListener('click', function () {
    document.getElementById('themePicker').classList.add('hidden');
  });

  document.getElementById('themePicker').addEventListener('click', function (e) {
    e.stopPropagation();
  });

  document.querySelectorAll('.theme-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const tema = this.getAttribute('data-theme');
      if (TEMAS_VALIDOS.includes(tema)) {
        aplicarTema(tema);
        document.getElementById('themePicker').classList.add('hidden');
      }
    });
  });

  function isFileProtocol() {
    return window.location.protocol === 'file:';
  }

  async function init() {
    if (isFileProtocol()) {
      console.warn('App aberto por file:// — requisições ao Supabase podem ser bloqueadas (CORS). Use um servidor local, ex.: npx serve .');
      const el = document.createElement('div');
      el.id = 'aviso-servidor';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#fef3c7;color:#854d0e;padding:12px;text-align:center;font-size:14px;z-index:9999;font-family:var(--font,sans-serif);';
      el.textContent = '⚠️ Para salvar no Supabase, abra o app por um servidor local (ex.: npx serve . ou extensão Live Server), não por arquivo duplo-clique.';
      document.body.prepend(el);
    }
    try {
      await loadFromSupabase();
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    }
    document.getElementById('receitasProduzidas').value = receitasProduzidas;
    atualizarInsumosUI();
    atualizarMetricas();
    atualizarMetas();
    atualizarEstoque();
    atualizarGraficos();
    atualizarDatalistSabores();
  }

  init();
})();
