// === DADOS GLOBAIS ===
var usuarios = [
    { id: 1, nome: 'Admin', email: 'admin@negrao.com', senha: '123456', tipo: 'admin', primeiroAcesso: false },
    { id: 2, nome: 'Usuario', email: 'user@negrao.com', senha: '123456', tipo: 'padrao', primeiroAcesso: false }
];

var produtos = [
    { id: 1, categoria: 'Ferramenta', especificacao: 'Furadeira', marca: 'Bosch', quantidade: 15, localizacao: 'A1', imagem: 'https://via.placeholder.com/200x150?text=Furadeira' },
    { id: 2, categoria: 'Ferramenta', especificacao: 'Lixadeira', marca: 'Makita', quantidade: 8, localizacao: 'A2', imagem: 'https://via.placeholder.com/200x150?text=Lixadeira' },
    { id: 3, categoria: 'EPI', especificacao: 'Luva de Proteção', marca: 'Safety', quantidade: 2, localizacao: 'B1', imagem: 'https://via.placeholder.com/200x150?text=Luva' },
    { id: 4, categoria: 'Químico', especificacao: 'WD-40', marca: 'WD-40', quantidade: 20, localizacao: 'B2', imagem: 'https://via.placeholder.com/200x150?text=WD40' },
    { id: 5, categoria: 'Elétrica', especificacao: 'Disjuntor', marca: 'Schneider', quantidade: 0, localizacao: 'C1', imagem: 'https://via.placeholder.com/200x150?text=Disjuntor' }
];

var historico = [
    { data: new Date().toISOString(), produtoId: 1, produtoNome: 'Furadeira', operacao: 'retirar', quantidade: 3, usuario: 'Admin', motivo: 'Manutenção preventiva' },
    { data: new Date().toISOString(), produtoId: 2, produtoNome: 'Lixadeira', operacao: 'adicionar', quantidade: 5, usuario: 'Admin' }
];


var solicitacoesRetirada = [];
var usuarioLogado = null;
var charts = {};
var produtoSelecionado = null;

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    configurarEventos();
    mostrarTela(usuarioLogado ? 'home-screen' : 'login-screen');
});

// === FUNÇÕES BÁSICAS ===
function carregarDados() {
    try {
        var dados = JSON.parse(localStorage.getItem('sistemaEstoque') || '{}');
        usuarios = dados.usuarios || usuarios;
        produtos = dados.produtos || produtos;
        historico = dados.historico || historico;
        solicitacoesRetirada = dados.solicitacoesRetirada || [];
        usuarioLogado = dados.usuarioLogado || null;
    } catch (e) {
        console.log('Usando dados padrão');
    }
}

function salvarDados() {
    try {
        localStorage.setItem('sistemaEstoque', JSON.stringify({
            usuarios, produtos, historico, solicitacoesRetirada, usuarioLogado
        }));
    } catch (e) {
        console.error('Erro ao salvar:', e);
    }
}

function mostrarAlerta(msg, tipo) {
    var toast = document.getElementById('liveToast');
    if (toast) {
        document.getElementById('toast-message').textContent = msg;
        document.getElementById('toast-title').textContent = 'Sistema';
        toast.className = 'toast show toast-' + tipo;
        new bootstrap.Toast(toast).show();
    } else {
        alert(msg);
    }
}

function mostrarTela(tela) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    var targetScreen = document.getElementById(tela);
    if (targetScreen) {
        targetScreen.classList.add('active');
        
        switch(tela) {
            case 'home-screen':
                atualizarDashboard();
                atualizarPermissoes();
                atualizarNotificacoesPendentes();
                break;
            case 'consultar-produtos-screen':
                carregarGridProdutos();
                document.getElementById('consulta-search').value = '';
                break;
            case 'produtos-cadastrados-screen':
                carregarTabelaProdutos();
                document.getElementById('produtos-search').value = '';
                break;
            case 'solicitacoes-screen':
                carregarSolicitacoesPendentes();
                break;
            case 'minhas-solicitacoes-screen':
                carregarMinhasSolicitacoes();
                break;
        }
    }
}

function redimensionarImagem(imagemSrc, callback) {
    var img = new Image();
    img.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var maxWidth = 400, maxHeight = 300;
        var ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = imagemSrc;
}

// === EVENTOS ===
function configurarEventos() {
    // Login/Logout
    addEvent('login-btn', 'click', fazerLogin);
    addEvent('logout-btn', 'click', fazerLogout);

    // Toggle senha
    addEvent('toggle-password', 'click', function() {
        var passwordField = document.getElementById('password');
        var icon = this.querySelector('i');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordField.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });

    // Esqueci senha
    addEvent('.forgot-password', 'click', function(e) {
        e.preventDefault();
        mostrarModalEsqueciSenha();
    });

    // Navegação
    addEvent('consultar-produtos', 'click', () => mostrarTela('consultar-produtos-screen'));
    addEvent('minhas-solicitacoes', 'click', () => mostrarTela('minhas-solicitacoes-screen'));
    addEvent('produtos-cadastrados', 'click', function() {
        if (verificarPermissao()) mostrarTela('produtos-cadastrados-screen');
    });
    addEvent('cadastrar-produtos', 'click', function() {
        if (verificarPermissao()) mostrarTela('cadastrar-produtos-screen');
    });
    addEvent('cadastrar-usuario', 'click', function() {
        if (verificarPermissao()) mostrarTela('cadastrar-usuario-screen');
    });
    addEvent('solicitacoes-retirada', 'click', function() {
        if (verificarPermissao()) mostrarTela('solicitacoes-screen');
    });

    // Botões de menu
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => mostrarTela('home-screen'));
    });
    
    // Pesquisas
    addEvent('consulta-search', 'input', function() {
        pesquisarProdutosGrid(this.value);
    });
    addEvent('consulta-search-btn', 'click', function() {
        pesquisarProdutosGrid(document.getElementById('consulta-search').value);
    });
    addEvent('produtos-search', 'input', function() {
        pesquisarProdutosTabela(this.value);
    });
    
    // Formulários
    addEvent('cadastrar-produto-form', 'submit', function(e) {
        e.preventDefault();
        cadastrarProduto();
    });
    addEvent('cadastrar-usuario-form', 'submit', function(e) {
        e.preventDefault();
        cadastrarUsuario();
    });
    
    // Botões da tabela
    addEvent('delete-btn', 'click', excluirProduto);
    addEvent('edit-btn', 'click', editarProduto);
    addEvent('excel-btn', 'click', exportarExcel);
    addEvent('history-btn', 'click', mostrarHistorico);
    
    // Upload de imagem
    addEvent('image-upload', 'click', () => document.getElementById('produto-imagem').click());
    addEvent('produto-imagem', 'change', handleImageUpload);
    addEvent('remove-image', 'click', removeImage);
    addEvent('limpar-btn', 'click', limparFormulario);
}

function addEvent(id, event, handler) {
    var element = typeof id === 'string' ? document.getElementById(id) || document.querySelector(id) : id;
    if (element) element.addEventListener(event, handler);
}

function verificarPermissao() {
    if (usuarioLogado && usuarioLogado.tipo === 'admin') {
        return true;
    } else {
        mostrarAlerta('Acesso restrito a administradores', 'warning');
        return false;
    }
}

// === LOGIN ===
function fazerLogin() {
    var email = document.getElementById('email').value.trim();
    var senha = document.getElementById('password').value;
    
    if (!email || !senha) {
        mostrarAlerta('Preencha todos os campos', 'warning');
        return;
    }
    
    var usuario = usuarios.find(u => u.email === email);
    if (!usuario) {
        mostrarAlerta('Usuário não encontrado', 'error');
        return;
    }
    
    if (usuario.senha !== senha) {
        mostrarAlerta('Senha incorreta', 'error');
        return;
    }
    
    usuarioLogado = usuario;
    document.getElementById('user-name').textContent = usuario.nome;
    salvarDados();
    mostrarTela('home-screen');
    mostrarAlerta('Bem-vindo, ' + usuario.nome + '!', 'success');
    
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
}

function fazerLogout() {
    usuarioLogado = null;
    salvarDados();
    mostrarTela('login-screen');
    mostrarAlerta('Logout realizado', 'info');
}

function atualizarPermissoes() {
    var isAdmin = usuarioLogado && usuarioLogado.tipo === 'admin';
    var isPadrao = usuarioLogado && usuarioLogado.tipo === 'padrao';
    
    // Elementos só para admin
    ['produtos-cadastrados', 'cadastrar-produtos', 'cadastrar-usuario', 'solicitacoes-retirada'].forEach(id => {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('disabled', !isAdmin);
    });

    // Mostrar/ocultar menu específico do usuário padrão
    var menuMinhasSolicitacoes = document.getElementById('menu-minhas-solicitacoes');
    if (menuMinhasSolicitacoes) {
        menuMinhasSolicitacoes.style.display = isPadrao ? 'block' : 'none';
    }

    // Ajustar card de usuários para não aparecer para usuário padrão
    var cardUsuarios = document.querySelectorAll('.admin-only');
    cardUsuarios.forEach(el => {
        el.style.display = isPadrao ? 'none' : 'block';
    });
}

function atualizarNotificacoesPendentes() {
    if (usuarioLogado && usuarioLogado.tipo === 'admin') {
        var pendentes = solicitacoesRetirada.filter(s => s.status === 'pendente').length;
        var badge = document.getElementById('badge-solicitacoes');
        if (badge) {
            if (pendentes > 0) {
                badge.textContent = pendentes;
                badge.style.display = 'inline-block';
                badge.classList.add('pulse');
            } else {
                badge.style.display = 'none';
                badge.classList.remove('pulse');
            }
        }
    }
}

function mostrarModalEsqueciSenha() {
    var modalHtml = `
        <div class="modal fade" id="esqueciSenhaModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">Recuperar Senha</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Digite seu e-mail para recuperar a senha:</p>
                        <input type="email" class="form-control" id="email-recuperacao" placeholder="seu@email.com" required>
                        <div class="alert alert-info mt-3">
                            <i class="fas fa-info-circle"></i> Para este demo, as senhas padrão são "123456".
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-warning" onclick="recuperarSenha()">Recuperar</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    var existente = document.getElementById('esqueciSenhaModal');
    if (existente) existente.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('esqueciSenhaModal')).show();
}

function recuperarSenha() {
    var email = document.getElementById('email-recuperacao').value.trim();
    
    if (!email) {
        mostrarAlerta('Digite um e-mail válido', 'warning');
        return;
    }
    
    var usuario = usuarios.find(u => u.email === email);
    
    if (!usuario) {
        mostrarAlerta('E-mail não encontrado no sistema', 'error');
        return;
    }
    
    bootstrap.Modal.getInstance(document.getElementById('esqueciSenhaModal')).hide();
    
    setTimeout(() => {
        var senhaModalHtml = `
            <div class="modal fade" id="senhaModal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title">Senha Recuperada</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <h4>Olá, ${usuario.nome}!</h4>
                            <p>Sua senha é:</p>
                            <div class="alert alert-success">
                                <h3>${usuario.senha}</h3>
                            </div>
                            <small class="text-muted">Em um sistema real, esta informação seria enviada por e-mail.</small>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" data-bs-dismiss="modal">OK</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', senhaModalHtml);
        new bootstrap.Modal(document.getElementById('senhaModal')).show();
    }, 500);
}

// === DASHBOARD ===
function atualizarDashboard() {
    var totalProdutos = produtos.length;
    var totalQuantidade = produtos.reduce((sum, p) => sum + p.quantidade, 0);
    var estoqueBaixo = produtos.filter(p => p.quantidade <= 5 && p.quantidade > 0).length;
    var totalUsuarios = usuarios.length;
    
    updateElement('total-produtos', totalProdutos);
    updateElement('total-quantidade', totalQuantidade);
    updateElement('estoque-baixo', estoqueBaixo);
    updateElement('total-usuarios', totalUsuarios);
    
    setTimeout(criarGraficos, 500);
}

function updateElement(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
}

function criarGraficos() {
    if (typeof Chart === 'undefined') {
        setTimeout(criarGraficos, 1000);
        return;
    }
    
    // Gráfico de categorias
    var ctx1 = document.getElementById('categoriaChart');
    if (ctx1) {
        if (charts.categoria) charts.categoria.destroy();
        
        var categorias = {};
        produtos.forEach(p => categorias[p.categoria] = (categorias[p.categoria] || 0) + 1);
        
        charts.categoria = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categorias),
                datasets: [{
                    data: Object.values(categorias),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Produtos por Categoria' },
                    legend: { position: 'bottom' }
                }
            }
        });
    }
    
    // Gráfico de estoque
    var ctx2 = document.getElementById('estoqueChart');
    if (ctx2) {
        if (charts.estoque) charts.estoque.destroy();
        
        var produtosLimitados = produtos.slice(0, 6);
        
        charts.estoque = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: produtosLimitados.map(p => p.especificacao.length > 10 ? 
                       p.especificacao.substr(0, 10) + '...' : p.especificacao),
                datasets: [{
                    label: 'Quantidade',
                    data: produtosLimitados.map(p => p.quantidade),
                    backgroundColor: produtosLimitados.map(p => {
                        if (p.quantidade === 0) return '#dc3545';
                        if (p.quantidade <= 5) return '#ffc107';
                        return '#198754';
                    })
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Níveis de Estoque' },
                    legend: { display: false }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

// === PESQUISAS ===
function pesquisarProdutosGrid(termo) {
    var container = document.getElementById('products-grid');
    if (!container) return;
    
    container.innerHTML = '';
    var termoLower = termo.toLowerCase().trim();
    var produtosFiltrados = termoLower === '' ? produtos : produtos.filter(produto =>
        produto.categoria.toLowerCase().includes(termoLower) ||
        produto.especificacao.toLowerCase().includes(termoLower) ||
        produto.marca.toLowerCase().includes(termoLower) ||
        produto.localizacao.toLowerCase().includes(termoLower) ||
        produto.id.toString().includes(termoLower)
    );
    
    if (produtosFiltrados.length === 0 && termoLower !== '') {
        container.innerHTML = `<div class="col-12 text-center">
            <div class="alert alert-info">
                <i class="fas fa-search"></i> Nenhum produto encontrado para "${termo}"
            </div></div>`;
        return;
    }
    
    var isAdmin = usuarioLogado && usuarioLogado.tipo === 'admin';
    var isPadrao = usuarioLogado && usuarioLogado.tipo === 'padrao';
    
    produtosFiltrados.forEach(produto => {
        var statusClass = produto.quantidade === 0 ? 'border-danger' : 
                         produto.quantidade <= 5 ? 'border-warning' : 'border-success';
        
        var badgeClass = produto.quantidade === 0 ? 'bg-danger' : 
                        produto.quantidade <= 5 ? 'bg-warning' : 'bg-success';
        
        // Botões diferentes para admin e usuário padrão
        var botoesHtml = '';
        if (isAdmin) {
            botoesHtml = `
                <div class="mb-2">
                    <div class="input-group input-group-sm">
                        <input type="number" class="form-control" id="qty-${produto.id}" min="1" placeholder="Qtd" style="max-width: 70px;">
                        <button class="btn btn-success btn-sm" onclick="alterarQuantidadeComInput(${produto.id}, 1)" title="Adicionar">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="alterarQuantidadeComInput(${produto.id}, -1)" 
                                ${produto.quantidade === 0 ? 'disabled' : ''} title="Remover">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>
                <div class="btn-group w-100">
                    <button class="btn btn-outline-success btn-sm" onclick="alterarQuantidade(${produto.id}, 1)" title="Adicionar 1">
                        +1
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="alterarQuantidade(${produto.id}, -1)" 
                            ${produto.quantidade === 0 ? 'disabled' : ''} title="Remover 1">
                        -1
                    </button>
                </div>`;
        } else if (isPadrao) {
            botoesHtml = `
                <div class="d-grid">
                    <button class="btn btn-warning btn-sm" onclick="solicitarRetirada(${produto.id})" 
                            ${produto.quantidade === 0 ? 'disabled' : ''} title="Solicitar Retirada">
                        <i class="fas fa-clipboard-list"></i> Solicitar
                    </button>
                </div>`;
        }
        
        container.innerHTML += `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100 ${statusClass}">
                    <div class="product-image">
                        <img src="${produto.imagem}" class="card-img-top" alt="${produto.especificacao}" 
                             onerror="this.src='https://via.placeholder.com/200x150?text=Produto'">
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${produto.categoria}</h6>
                        <p class="card-text small">
                            <strong>${produto.especificacao}</strong><br>
                            Marca: ${produto.marca}<br>
                            Local: <span class="badge bg-info">${produto.localizacao}</span><br>
                            Qtd: <span class="badge ${badgeClass}">${produto.quantidade}</span>
                        </p>
                        ${botoesHtml}
                    </div>
                </div>
            </div>`;
    });
}

function pesquisarProdutosTabela(termo) {
    var tbody = document.getElementById('products-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    var termoLower = termo.toLowerCase().trim();
    var produtosFiltrados = termoLower === '' ? produtos : produtos.filter(produto =>
        produto.categoria.toLowerCase().includes(termoLower) ||
        produto.especificacao.toLowerCase().includes(termoLower) ||
        produto.marca.toLowerCase().includes(termoLower) ||
        produto.localizacao.toLowerCase().includes(termoLower) ||
        produto.id.toString().includes(termoLower)
    );
    
    if (produtosFiltrados.length === 0 && termoLower !== '') {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">
            <div class="alert alert-info mb-0">
                <i class="fas fa-search"></i> Nenhum produto encontrado para "${termo}"
            </div></td></tr>`;
        return;
    }
    
    produtosFiltrados.forEach(produto => {
        var statusClass = produto.quantidade === 0 ? 'table-danger' : 
                         produto.quantidade <= 5 ? 'table-warning' : '';
        
        var badgeClass = produto.quantidade === 0 ? 'bg-danger' : 
                        produto.quantidade <= 5 ? 'bg-warning' : 'bg-success';
        
        var tr = document.createElement('tr');
        tr.className = statusClass;
        tr.setAttribute('data-id', produto.id);
        tr.innerHTML = `
            <td>${produto.id}</td>
            <td>${produto.categoria}</td>
            <td>${produto.especificacao}</td>
            <td>${produto.marca}</td>
            <td><span class="badge ${badgeClass}">${produto.quantidade}</span></td>
            <td><span class="badge bg-info">${produto.localizacao}</span></td>
            <td><button class="btn btn-primary btn-sm" onclick="verProduto(${produto.id})">
                <i class="fas fa-eye"></i>
            </button></td>`;
        
        tr.addEventListener('click', function() {
            tbody.querySelectorAll('tr').forEach(row => row.classList.remove('table-info', 'selected'));
            this.classList.add('table-info', 'selected');
            produtoSelecionado = produto.id;
        });
        
        tbody.appendChild(tr);
    });
}

// === SISTEMA DE SOLICITAÇÃO DE RETIRADA ===
function solicitarRetirada(produtoId) {
    var produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    var modalHtml = `
        <div class="modal fade" id="solicitarRetiradaModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">Solicitar Retirada de Produto</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <strong>Produto:</strong> ${produto.especificacao}<br>
                            <strong>Estoque atual:</strong> ${produto.quantidade} unidades
                        </div>
                        
                        <div class="mb-3">
                            <label for="quantidade-retirada" class="form-label">Quantidade a retirar *</label>
                            <input type="number" class="form-control" id="quantidade-retirada" 
                                   min="1" max="${produto.quantidade}" required>
                            <small class="text-muted">Máximo: ${produto.quantidade} unidades</small>
                        </div>
                        
                        <div class="mb-3">
                            <label for="motivo-retirada" class="form-label">Motivo da retirada *</label>
                            <textarea class="form-control" id="motivo-retirada" rows="3" 
                                      placeholder="Descreva o motivo da retirada..." required></textarea>
                        </div>
                        
                        <div class="alert alert-warning">
                            <i class="fas fa-info-circle"></i> 
                            Esta solicitação será enviada para aprovação do administrador.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-warning" onclick="enviarSolicitacaoRetirada(${produtoId})">
                            <i class="fas fa-paper-plane"></i> Enviar Solicitação
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    
    var existente = document.getElementById('solicitarRetiradaModal');
    if (existente) existente.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('solicitarRetiradaModal')).show();
}

function enviarSolicitacaoRetirada(produtoId) {
    var quantidade = parseInt(document.getElementById('quantidade-retirada').value);
    var motivo = document.getElementById('motivo-retirada').value.trim();
    
    if (!quantidade || quantidade <= 0) {
        mostrarAlerta('Digite uma quantidade válida', 'warning');
        return;
    }
    
    if (!motivo) {
        mostrarAlerta('Digite o motivo da retirada', 'warning');
        return;
    }
    
    var produto = produtos.find(p => p.id === produtoId);
    if (quantidade > produto.quantidade) {
        mostrarAlerta('Quantidade solicitada maior que o estoque', 'error');
        return;
    }
    
    var novaSolicitacao = {
        id: Date.now(),
        produtoId: produtoId,
        produtoNome: produto.especificacao,
        quantidade: quantidade,
        motivo: motivo,
        solicitante: usuarioLogado.nome,
        dataSolicitacao: new Date().toISOString(),
        status: 'pendente'
    };
    
    solicitacoesRetirada.push(novaSolicitacao);
    salvarDados();
    
    bootstrap.Modal.getInstance(document.getElementById('solicitarRetiradaModal')).hide();
    mostrarAlerta('Solicitação enviada para aprovação!', 'success');
}

// === TELA DE SOLICITAÇÕES PENDENTES (ADMIN) ===
function carregarSolicitacoesPendentes() {
    var container = document.getElementById('solicitacoes-container');
    if (!container) return;
    
    var pendentes = solicitacoesRetirada.filter(s => s.status === 'pendente');
    
    if (pendentes.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-inbox"></i> Nenhuma solicitação pendente
            </div>`;
        return;
    }
    
    container.innerHTML = pendentes.map(solicitacao => {
        var produto = produtos.find(p => p.id === solicitacao.produtoId);
        var data = new Date(solicitacao.dataSolicitacao);
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h5 class="card-title">${solicitacao.produtoNome}</h5>
                            <p class="card-text">
                                <strong>Quantidade:</strong> ${solicitacao.quantidade} unidades<br>
                                <strong>Solicitante:</strong> ${solicitacao.solicitante}<br>
                                <strong>Data:</strong> ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR')}<br>
                                <strong>Motivo:</strong> ${solicitacao.motivo}
                            </p>
                            <span class="badge bg-info">Estoque atual: ${produto ? produto.quantidade : 'N/A'}</span>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-success me-2" onclick="aprovarSolicitacao(${solicitacao.id})">
                                <i class="fas fa-check"></i> Aprovar
                            </button>
                            <button class="btn btn-danger" onclick="rejeitarSolicitacao(${solicitacao.id})">
                                <i class="fas fa-times"></i> Rejeitar
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function aprovarSolicitacao(solicitacaoId) {
    var solicitacao = solicitacoesRetirada.find(s => s.id === solicitacaoId);
    if (!solicitacao) return;
    
    var produto = produtos.find(p => p.id === solicitacao.produtoId);
    if (!produto) {
        mostrarAlerta('Produto não encontrado', 'error');
        return;
    }
    
    if (solicitacao.quantidade > produto.quantidade) {
        mostrarAlerta('Quantidade solicitada maior que o estoque atual', 'error');
        return;
    }
    
    // Aprovar a solicitação
    produto.quantidade -= solicitacao.quantidade;
    solicitacao.status = 'aprovada';
    solicitacao.dataAprovacao = new Date().toISOString();
    solicitacao.aprovadoPor = usuarioLogado.nome;
    
    // Registrar no histórico
    historico.push({
        data: new Date().toISOString(),
        produtoId: produto.id,
        produtoNome: produto.especificacao,
        operacao: 'retirar',
        quantidade: solicitacao.quantidade,
        usuario: solicitacao.solicitante,
        motivo: solicitacao.motivo,
        aprovadoPor: usuarioLogado.nome
    });
    
    salvarDados();
    carregarSolicitacoesPendentes();
    atualizarNotificacoesPendentes();
    mostrarAlerta('Solicitação aprovada com sucesso!', 'success');
}

function rejeitarSolicitacao(solicitacaoId) {
    var motivo = prompt('Digite o motivo da rejeição (opcional):');
    
    var solicitacao = solicitacoesRetirada.find(s => s.id === solicitacaoId);
    if (!solicitacao) return;
    
    solicitacao.status = 'rejeitada';
    solicitacao.dataRejeicao = new Date().toISOString();
    solicitacao.rejeitadoPor = usuarioLogado.nome;
    solicitacao.motivoRejeicao = motivo || 'Não informado';
    
    salvarDados();
    carregarSolicitacoesPendentes();
    atualizarNotificacoesPendentes();
    mostrarAlerta('Solicitação rejeitada', 'info');
}

// === GRID/TABELA ===
function carregarGridProdutos() {
    pesquisarProdutosGrid('');
}

function carregarTabelaProdutos() {
    pesquisarProdutosTabela('');
}

function alterarQuantidade(id, delta) {
    var produto = produtos.find(p => p.id === id);
    if (!produto) return;
    
    if (delta < 0 && produto.quantidade === 0) {
        mostrarAlerta('Produto sem estoque', 'warning');
        return;
    }
    
    produto.quantidade += delta;
    if (produto.quantidade < 0) produto.quantidade = 0;
    
    historico.push({
        data: new Date().toISOString(),
        produtoId: id,
        produtoNome: produto.especificacao,
        operacao: delta > 0 ? 'adicionar' : 'retirar',
        quantidade: Math.abs(delta),
        usuario: usuarioLogado ? usuarioLogado.nome : 'Sistema'
    });
    
    salvarDados();
    carregarGridProdutos();
    mostrarAlerta('Quantidade atualizada', 'success');
    
    if (document.getElementById('home-screen').classList.contains('active')) {
        atualizarDashboard();
    }
}

function alterarQuantidadeComInput(id, operacao) {
    var inputQty = document.getElementById('qty-' + id);
    var quantidade = parseInt(inputQty.value) || 1;
    
    if (quantidade <= 0) {
        mostrarAlerta('Digite uma quantidade válida', 'warning');
        return;
    }
    
    var produto = produtos.find(p => p.id === id);
    if (!produto) return;
    
    if (operacao < 0 && quantidade > produto.quantidade) {
        mostrarAlerta('Quantidade a remover maior que o estoque atual', 'warning');
        return;
    }
    
    var deltaTotal = quantidade * operacao;
    produto.quantidade += deltaTotal;
    if (produto.quantidade < 0) produto.quantidade = 0;
    
    historico.push({
        data: new Date().toISOString(),
        produtoId: id,
        produtoNome: produto.especificacao,
        operacao: operacao > 0 ? 'adicionar' : 'retirar',
        quantidade: quantidade,
        usuario: usuarioLogado ? usuarioLogado.nome : 'Sistema'
    });
    
    salvarDados();
    carregarGridProdutos();
    mostrarAlerta(`${quantidade} ${quantidade === 1 ? 'unidade' : 'unidades'} ${operacao > 0 ? 'adicionada(s)' : 'removida(s)'}`, 'success');
    
    // Limpar o campo
    inputQty.value = '';
    
    if (document.getElementById('home-screen').classList.contains('active')) {
        atualizarDashboard();
    }
}

// === MINHAS SOLICITAÇÕES (USUÁRIO PADRÃO) ===
function carregarMinhasSolicitacoes() {
    var container = document.getElementById('minhas-solicitacoes-container');
    if (!container) return;
    
    var minhasSolicitacoes = solicitacoesRetirada.filter(s => s.solicitante === usuarioLogado.nome);
    
    if (minhasSolicitacoes.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-inbox"></i> Você ainda não fez nenhuma solicitação de retirada
            </div>`;
        return;
    }
    
    // Ordenar por data (mais recente primeiro)
    minhasSolicitacoes.sort((a, b) => new Date(b.dataSolicitacao) - new Date(a.dataSolicitacao));
    
    container.innerHTML = minhasSolicitacoes.map(solicitacao => {
        var data = new Date(solicitacao.dataSolicitacao);
        var statusInfo = getStatusInfo(solicitacao.status);
        var detalhesStatus = '';
        
        if (solicitacao.status === 'aprovada' && solicitacao.dataAprovacao) {
            var dataAprovacao = new Date(solicitacao.dataAprovacao);
            detalhesStatus = `<br><small class="text-success"><i class="fas fa-check"></i> Aprovada em ${dataAprovacao.toLocaleDateString('pt-BR')} por ${solicitacao.aprovadoPor}</small>`;
        } else if (solicitacao.status === 'rejeitada' && solicitacao.dataRejeicao) {
            var dataRejeicao = new Date(solicitacao.dataRejeicao);
            detalhesStatus = `<br><small class="text-danger"><i class="fas fa-times"></i> Rejeitada em ${dataRejeicao.toLocaleDateString('pt-BR')} por ${solicitacao.rejeitadoPor}</small>`;
            if (solicitacao.motivoRejeicao) {
                detalhesStatus += `<br><small class="text-muted">Motivo: ${solicitacao.motivoRejeicao}</small>`;
            }
        }
        
        return `
            <div class="card mb-3 ${statusInfo.cardClass}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h5 class="card-title">${solicitacao.produtoNome}</h5>
                            <p class="card-text">
                                <strong>Quantidade:</strong> ${solicitacao.quantidade} unidades<br>
                                <strong>Data da solicitação:</strong> ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR')}<br>
                                <strong>Motivo:</strong> ${solicitacao.motivo}
                                ${detalhesStatus}
                            </p>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="badge ${statusInfo.badgeClass} fs-6">${statusInfo.texto}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function getStatusInfo(status) {
    switch(status) {
        case 'pendente':
            return {
                texto: 'PENDENTE',
                badgeClass: 'bg-warning text-dark',
                cardClass: 'border-warning'
            };
        case 'aprovada':
            return {
                texto: 'APROVADA',
                badgeClass: 'bg-success',
                cardClass: 'border-success'
            };
        case 'rejeitada':
            return {
                texto: 'REJEITADA',
                badgeClass: 'bg-danger',
                cardClass: 'border-danger'
            };
        default:
            return {
                texto: status.toUpperCase(),
                badgeClass: 'bg-secondary',
                cardClass: 'border-secondary'
            };
    }
}

function verProduto(id) {
    var produto = produtos.find(p => p.id === id);
    if (!produto) return;
    
    var modalHtml = `
        <div class="modal fade" id="verProdutoModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detalhes do Produto</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <img src="${produto.imagem}" class="img-fluid mb-3" style="max-height: 200px;" 
                             onerror="this.src='https://via.placeholder.com/200x150?text=Produto'">
                        <p><strong>Código:</strong> ${produto.id}</p>
                        <p><strong>Categoria:</strong> ${produto.categoria}</p>
                        <p><strong>Especificação:</strong> ${produto.especificacao}</p>
                        <p><strong>Marca:</strong> ${produto.marca}</p>
                        <p><strong>Quantidade:</strong> ${produto.quantidade}</p>
                        <p><strong>Localização:</strong> ${produto.localizacao}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    var existente = document.getElementById('verProdutoModal');
    if (existente) existente.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('verProdutoModal')).show();
}

// === CADASTROS ===
function cadastrarProduto() {
    var categoria = document.getElementById('categoria').value.trim();
    var especificacao = document.getElementById('especificacao').value.trim();
    var marca = document.getElementById('marca').value.trim();
    var quantidade = parseInt(document.getElementById('quantidade').value) || 0;
    var localizacao = document.getElementById('localizacao').value.trim().toUpperCase();
    
    if (!categoria || !especificacao || !marca || !localizacao) {
        mostrarAlerta('Preencha todos os campos', 'warning');
        return;
    }
    
    if (produtos.some(p => p.localizacao === localizacao)) {
        mostrarAlerta('Localização já ocupada', 'error');
        return;
    }
    
    var novoId = produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1;
    var previewImg = document.getElementById('preview-img');
    var imagem = 'https://via.placeholder.com/200x150?text=Produto';
    
    if (previewImg && previewImg.src && previewImg.src !== '#' && previewImg.src !== window.location.href) {
        imagem = previewImg.src;
    }
    
    var novoProduto = {
        id: novoId, categoria, especificacao, marca, quantidade, localizacao, imagem
    };
    
    produtos.push(novoProduto);
    
    historico.push({
        data: new Date().toISOString(),
        produtoId: novoId,
        produtoNome: especificacao,
        operacao: 'cadastrar',
        quantidade: quantidade,
        usuario: usuarioLogado.nome,
        detalhes: `Categoria: ${categoria}, Marca: ${marca}, Localização: ${localizacao}`
    });
    
    salvarDados();
    limparFormulario();
    mostrarAlerta('Produto cadastrado com sucesso!', 'success');
}

function cadastrarUsuario() {
    var nome = document.getElementById('nome').value.trim();
    var email = document.getElementById('user-email').value.trim();
    
    var tipoRadios = document.querySelectorAll('input[name="tipo-usuario"]');
    var tipo = 'padrao';
    tipoRadios.forEach(radio => {
        if (radio.checked) tipo = radio.value;
    });
    
    if (!nome || !email) {
        mostrarAlerta('Preencha todos os campos', 'warning');
        return;
    }
    
    if (usuarios.some(u => u.email === email)) {
        mostrarAlerta('E-mail já cadastrado', 'error');
        return;
    }
    
    var senha = Math.random().toString(36).substr(2, 8);
    var novoId = usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id)) + 1 : 1;
    
    var novoUsuario = {
        id: novoId, nome, email, senha, tipo, primeiroAcesso: true
    };
    
    usuarios.push(novoUsuario);
    
    historico.push({
        data: new Date().toISOString(),
        produtoId: 0,
        produtoNome: `${nome} (${email})`,
        operacao: 'cadastrar_usuario',
        quantidade: 1,
        usuario: usuarioLogado.nome,
        detalhes: `Tipo: ${tipo === 'admin' ? 'Administrador' : 'Usuário Padrão'}, Email: ${email}`
    });
    
    salvarDados();
    
    document.getElementById('cadastrar-usuario-form').reset();
    document.getElementById('padrao').checked = true;
    
    mostrarModalUsuario(novoUsuario, senha);
}

function mostrarModalUsuario(usuario, senha) {
    var modalHtml = `
        <div class="modal fade" id="usuarioModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">Usuário Cadastrado!</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <h4>${usuario.nome}</h4>
                        <p><strong>E-mail:</strong> ${usuario.email}</p>
                        <p><strong>Tipo:</strong> ${usuario.tipo === 'admin' ? 'Administrador' : 'Usuário Padrão'}</p>
                        <div class="alert alert-warning">
                            <strong>Senha Temporária:</strong><br>
                            <h3>${senha}</h3>
                        </div>
                        <small class="text-muted">O usuário deve alterar a senha no primeiro acesso</small>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" data-bs-dismiss="modal">OK</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    var existente = document.getElementById('usuarioModal');
    if (existente) existente.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('usuarioModal')).show();
}

// === UPLOAD DE IMAGEM ===
function handleImageUpload() {
    if (this.files && this.files[0]) {
        var file = this.files[0];
        
        if (file.size > 5 * 1024 * 1024) {
            mostrarAlerta('Arquivo muito grande. Máximo 5MB permitido.', 'warning');
            return;
        }
        
        var reader = new FileReader();
        reader.onload = function(e) {
            redimensionarImagem(e.target.result, function(imagemRedimensionada) {
                document.getElementById('preview-img').src = imagemRedimensionada;
                document.getElementById('image-preview').style.display = 'block';
                document.getElementById('image-upload').style.display = 'none';
            });
        };
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    document.getElementById('preview-img').src = '#';
    document.getElementById('produto-imagem').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('image-upload').style.display = 'flex';
}

function limparFormulario() {
    document.getElementById('cadastrar-produto-form').reset();
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('image-upload').style.display = 'flex';
}

// === EDITAR PRODUTO ===
function editarProduto() {
    if (!produtoSelecionado) {
        mostrarAlerta('Selecione um produto na tabela', 'warning');
        return;
    }
    
    var produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) {
        mostrarAlerta('Produto não encontrado', 'error');
        return;
    }
    
    var modalHtml = `
        <div class="modal fade" id="editarModal">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">Editar Produto</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Categoria</label>
                                <input type="text" class="form-control" id="edit-categoria" value="${produto.categoria}">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Especificação</label>
                                <input type="text" class="form-control" id="edit-especificacao" value="${produto.especificacao}">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Marca</label>
                                <input type="text" class="form-control" id="edit-marca" value="${produto.marca}">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Quantidade</label>
                                <input type="number" class="form-control" id="edit-quantidade" value="${produto.quantidade}" min="0">
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Localização</label>
                            <input type="text" class="form-control" id="edit-localizacao" value="${produto.localizacao}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Imagem</label>
                            <div class="text-center mb-3">
                                <img id="edit-preview" src="${produto.imagem}" class="img-fluid" style="max-height: 200px;" 
                                     onerror="this.src='https://via.placeholder.com/200x150?text=Produto'">
                            </div>
                            <input type="file" class="form-control mb-2" id="edit-file" accept="image/*">
                            <input type="url" class="form-control" id="edit-url" placeholder="Ou cole uma URL" value="${produto.imagem}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-warning" onclick="salvarEdicao(${produto.id})">Salvar</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    var existente = document.getElementById('editarModal');
    if (existente) existente.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    setTimeout(() => {
        var fileInput = document.getElementById('edit-file');
        var urlInput = document.getElementById('edit-url');
        var preview = document.getElementById('edit-preview');
        
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    var file = this.files[0];
                    if (file.size > 5 * 1024 * 1024) {
                        mostrarAlerta('Arquivo muito grande. Máximo 5MB permitido.', 'warning');
                        return;
                    }
                    
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        redimensionarImagem(e.target.result, function(imagemRedimensionada) {
                            preview.src = imagemRedimensionada;
                            urlInput.value = imagemRedimensionada;
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        if (urlInput) {
            urlInput.addEventListener('input', function() {
                if (this.value.trim()) {
                    preview.src = this.value;
                    preview.onerror = () => this.src = 'https://via.placeholder.com/200x150?text=Erro+ao+carregar';
                }
            });
        }
    }, 100);
    
    new bootstrap.Modal(document.getElementById('editarModal')).show();
}

function salvarEdicao(id) {
    var produto = produtos.find(p => p.id === id);
    if (!produto) return;
    
    var categoria = document.getElementById('edit-categoria').value.trim();
    var especificacao = document.getElementById('edit-especificacao').value.trim();
    var marca = document.getElementById('edit-marca').value.trim();
    var quantidade = parseInt(document.getElementById('edit-quantidade').value) || 0;
    var localizacao = document.getElementById('edit-localizacao').value.trim().toUpperCase();
    var imagem = document.getElementById('edit-url').value.trim() || produto.imagem;
    
    if (!categoria || !especificacao || !marca || !localizacao) {
        mostrarAlerta('Preencha todos os campos', 'warning');
        return;
    }
    
    var locDuplicada = produtos.some(p => p.localizacao === localizacao && p.id !== id);
    if (locDuplicada) {
        mostrarAlerta('Localização já ocupada por outro produto', 'error');
        return;
    }
    
    // Registrar mudanças detalhadas no histórico
    var mudancas = [];
    
    if (produto.categoria !== categoria) {
        mudancas.push(`Categoria: "${produto.categoria}" → "${categoria}"`);
    }
    if (produto.especificacao !== especificacao) {
        mudancas.push(`Especificação: "${produto.especificacao}" → "${especificacao}"`);
    }
    if (produto.marca !== marca) {
        mudancas.push(`Marca: "${produto.marca}" → "${marca}"`);
    }
    if (produto.localizacao !== localizacao) {
        mudancas.push(`Localização: "${produto.localizacao}" → "${localizacao}"`);
    }
    if (produto.imagem !== imagem) {
        mudancas.push(`Imagem alterada`);
    }
    
    // Registrar mudança de quantidade separadamente
    if (produto.quantidade !== quantidade) {
        var diferenca = quantidade - produto.quantidade;
        historico.push({
            data: new Date().toISOString(),
            produtoId: id,
            produtoNome: produto.especificacao,
            operacao: diferenca > 0 ? 'adicionar' : 'retirar',
            quantidade: Math.abs(diferenca),
            usuario: usuarioLogado.nome
        });
    }
    
    // Registrar outras mudanças se houver
    if (mudancas.length > 0) {
        historico.push({
            data: new Date().toISOString(),
            produtoId: id,
            produtoNome: produto.especificacao,
            operacao: 'editar',
            quantidade: 0,
            usuario: usuarioLogado.nome,
            detalhes: mudancas.join('; ')
        });
    }
    
    Object.assign(produto, { categoria, especificacao, marca, quantidade, localizacao, imagem });
    
    salvarDados();
    carregarTabelaProdutos();
    
    bootstrap.Modal.getInstance(document.getElementById('editarModal')).hide();
    mostrarAlerta('Produto atualizado com sucesso!', 'success');
    produtoSelecionado = null;
}

// === EXCLUIR ===
function excluirProduto() {
    if (!produtoSelecionado) {
        mostrarAlerta('Selecione um produto', 'warning');
        return;
    }
    
    var produto = produtos.find(p => p.id === produtoSelecionado);
    
    if (confirm('Excluir ' + produto.especificacao + '?')) {
        historico.push({
            data: new Date().toISOString(),
            produtoId: produtoSelecionado,
            produtoNome: produto.especificacao,
            operacao: 'excluir',
            quantidade: produto.quantidade,
            usuario: usuarioLogado.nome,
            detalhes: `Categoria: ${produto.categoria}, Marca: ${produto.marca}, Localização: ${produto.localizacao}`
        });
        
        produtos = produtos.filter(p => p.id !== produtoSelecionado);
        salvarDados();
        carregarTabelaProdutos();
        mostrarAlerta('Produto excluído', 'success');
        produtoSelecionado = null;
    }
}

// === EXCEL ===
function exportarExcel() {
    if (typeof XLSX === 'undefined') {
        mostrarAlerta('Biblioteca Excel não carregada', 'error');
        return;
    }
    
    try {
        var dados = produtos.map(p => ({
            'Código': p.id,
            'Categoria': p.categoria,
            'Especificação': p.especificacao,
            'Marca': p.marca,
            'Quantidade': p.quantidade,
            'Localização': p.localizacao,
            'Status': p.quantidade === 0 ? 'SEM ESTOQUE' : 
                     p.quantidade <= 5 ? 'ESTOQUE BAIXO' : 'NORMAL'
        }));
        
        var ws = XLSX.utils.json_to_sheet(dados);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
        
        var hoje = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, 'Relatorio_Estoque_' + hoje + '.xlsx');
        
        mostrarAlerta('Excel exportado com sucesso!', 'success');
        
        historico.push({
            data: new Date().toISOString(),
            produtoId: 0,
            produtoNome: 'Relatório Excel',
            operacao: 'exportar',
            quantidade: produtos.length,
            usuario: usuarioLogado.nome
        });
        salvarDados();
        
    } catch (error) {
        mostrarAlerta('Erro ao exportar Excel: ' + error.message, 'error');
    }
}

// === HISTÓRICO DETALHADO COM FILTROS ===
function mostrarHistorico() {
    if (historico.length === 0) {
        mostrarAlerta('Nenhum histórico encontrado. Realize algumas operações primeiro.', 'info');
        return;
    }
    
    // Ordenar por data (mais recente primeiro)
    var historicoOrdenado = historico.slice().sort((a, b) => new Date(b.data) - new Date(a.data));
    
    var tabelaHtml = `
        <table class="table table-hover table-sm" id="tabela-historico">
            <thead class="table-dark">
                <tr>
                    <th style="width: 15%">Data e Hora</th>
                    <th style="width: 20%">Usuário</th>
                    <th style="width: 15%">Operação</th>
                    <th style="width: 25%">Produto/Item</th>
                    <th style="width: 10%">Quantidade</th>
                    <th style="width: 15%">Detalhes</th>
                </tr>
            </thead>
            <tbody>`;
    
    historicoOrdenado.slice(0, 200).forEach(h => {
        var data = new Date(h.data);
        var dataFormatada = data.toLocaleDateString('pt-BR');
        var horaFormatada = data.toLocaleTimeString('pt-BR');
        var operacaoInfo = getOperacaoInfo(h.operacao, h.quantidade);
        var rowClass = getRowClass(h.operacao);
        var detalhes = getDetalhesOperacao(h);
        
        tabelaHtml += `
            <tr class="${rowClass}" data-operacao="${h.operacao}" data-usuario="${h.usuario}" data-produto="${h.produtoNome.toLowerCase()}">
                <td>
                    <strong>${dataFormatada}</strong><br>
                    <small class="text-muted">${horaFormatada}</small>
                </td>
                <td>
                    <i class="fas fa-user-circle me-1"></i>
                    <strong>${h.usuario}</strong>
                </td>
                <td>
                    <span class="badge ${operacaoInfo.badgeClass} d-block mb-1">${operacaoInfo.texto}</span>
                    <small class="text-muted">${operacaoInfo.descricao}</small>
                </td>
                <td>
                    <strong>${h.produtoNome}</strong>
                    ${h.produtoId > 0 ? `<br><small class="text-muted">Código: ${h.produtoId}</small>` : ''}
                </td>
                <td class="text-center">
                    <span class="badge ${operacaoInfo.quantidadeBadge} fs-6">${h.quantidade}</span>
                </td>
                <td>
                    <small>${detalhes}</small>
                </td>
            </tr>`;
    });
    
    tabelaHtml += '</tbody></table>';
    
    var modalHtml = `
        <div class="modal fade" id="historicoModal">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-history me-2"></i>
                            Histórico Detalhado de Movimentações (${historico.length} registros)
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-primary">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Histórico Individual:</strong> Cada linha representa uma ação específica realizada por um usuário.
                            Mostrando as ${Math.min(200, historico.length)} movimentações mais recentes.
                        </div>
                        
                        <!-- Filtros rápidos -->
                        <div class="row mb-3">
                            <div class="col-md-3">
                                <select class="form-select form-select-sm" id="filtro-operacao">
                                    <option value="">Todas as operações</option>
                                    <option value="adicionar">Entradas</option>
                                    <option value="retirar">Saídas</option>
                                    <option value="cadastrar">Cadastros</option>
                                    <option value="editar">Edições</option>
                                    <option value="excluir">Exclusões</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select form-select-sm" id="filtro-usuario">
                                    <option value="">Todos os usuários</option>
                                    ${[...new Set(historico.map(h => h.usuario))].map(u => `<option value="${u}">${u}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-6">
                                <input type="text" class="form-control form-control-sm" id="filtro-produto" placeholder="Filtrar por produto...">
                            </div>
                        </div>
                        
                        <div class="table-responsive" style="max-height: 500px;">
                            ${tabelaHtml}
                        </div>
                        
                        ${historico.length > 200 ? '<p class="text-muted text-center mt-3">Mostrando as 200 movimentações mais recentes</p>' : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" onclick="exportarHistoricoExcel()">
                            <i class="fas fa-file-excel"></i> Exportar Histórico
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    var existente = document.getElementById('historicoModal');
    if (existente) existente.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    
    setTimeout(() => {
        configurarFiltrosHistorico();
    }, 100);
    
    new bootstrap.Modal(document.getElementById('historicoModal')).show();
}

function getOperacaoInfo(operacao, quantidade) {
    switch(operacao) {
        case 'adicionar':
            return {
                texto: 'ENTRADA',
                descricao: 'Adicionou ao estoque',
                badgeClass: 'bg-success',
                quantidadeBadge: 'bg-success'
            };
        case 'retirar':
            return {
                texto: 'SAÍDA',
                descricao: 'Retirou do estoque',
                badgeClass: 'bg-danger',
                quantidadeBadge: 'bg-danger'
            };
        case 'cadastrar':
            return {
                texto: 'CADASTRO',
                descricao: 'Cadastrou novo produto',
                badgeClass: 'bg-primary',
                quantidadeBadge: 'bg-primary'
            };
        case 'editar':
            return {
                texto: 'EDIÇÃO',
                descricao: 'Editou informações',
                badgeClass: 'bg-warning',
                quantidadeBadge: 'bg-warning'
            };
        case 'excluir':
            return {
                texto: 'EXCLUSÃO',
                descricao: 'Excluiu produto',
                badgeClass: 'bg-dark',
                quantidadeBadge: 'bg-dark'
            };
        case 'cadastrar_usuario':
            return {
                texto: 'NOVO USUÁRIO',
                descricao: 'Cadastrou usuário',
                badgeClass: 'bg-info',
                quantidadeBadge: 'bg-info'
            };
        case 'exportar':
            return {
                texto: 'EXPORTAÇÃO',
                descricao: 'Exportou relatório',
                badgeClass: 'bg-secondary',
                quantidadeBadge: 'bg-secondary'
            };
        default:
            return {
                texto: operacao.toUpperCase(),
                descricao: 'Operação realizada',
                badgeClass: 'bg-light text-dark',
                quantidadeBadge: 'bg-light text-dark'
            };
    }
}

function getRowClass(operacao) {
    switch(operacao) {
        case 'adicionar': return 'table-success';
        case 'retirar': return 'table-danger';
        case 'cadastrar': return 'table-primary';
        case 'editar': return 'table-warning';
        case 'excluir': return 'table-secondary';
        default: return '';
    }
}

function getDetalhesOperacao(h) {
    var data = new Date(h.data);
    var tempoDecorrido = getTempoDecorrido(data);
    var detalhesAdicionais = h.detalhes ? `<br><strong>Detalhes:</strong> ${h.detalhes}` : '';
    var motivoText = h.motivo ? `<br><strong>Motivo:</strong> ${h.motivo}` : '';
    var aprovadoPorText = h.aprovadoPor ? `<br><strong>Aprovado por:</strong> ${h.aprovadoPor}` : '';
    
    switch(h.operacao) {
        case 'adicionar':
            return `Adicionou ${h.quantidade} ${h.quantidade === 1 ? 'unidade' : 'unidades'} ao estoque${motivoText}${aprovadoPorText}${detalhesAdicionais}<br><em>${tempoDecorrido}</em>`;
        case 'retirar':
            return `Retirou ${h.quantidade} ${h.quantidade === 1 ? 'unidade' : 'unidades'} do estoque${motivoText}${aprovadoPorText}${detalhesAdicionais}<br><em>${tempoDecorrido}</em>`;
        case 'cadastrar':
            return `Cadastrou com estoque inicial de ${h.quantidade} ${h.quantidade === 1 ? 'unidade' : 'unidades'}${detalhesAdicionais}<br><em>${tempoDecorrido}</em>`;
        case 'editar':
            return `Editou informações do produto${detalhesAdicionais}<br><em>${tempoDecorrido}</em>`;
        case 'excluir':
            return `Produto excluído (tinha ${h.quantidade} em estoque)${detalhesAdicionais}<br><em>${tempoDecorrido}</em>`;
        case 'cadastrar_usuario':
            return `Novo usuário cadastrado no sistema${detalhesAdicionais}<br><em>${tempoDecorrido}</em>`;
        case 'exportar':
            return `Relatório exportado (${h.quantidade} registros)${detalhesAdicionais}<br><em>${tempoDecorrido}</em>`;
        default:
            return `Operação realizada${detalhesAdicionais}<br><em>${tempoDecorrido}</em>`;
    }
}

function getTempoDecorrido(data) {
    var agora = new Date();
    var diferenca = agora - data;
    var minutos = Math.floor(diferenca / 60000);
    var horas = Math.floor(minutos / 60);
    var dias = Math.floor(horas / 24);
    
    if (dias > 0) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    if (horas > 0) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    if (minutos > 0) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    return 'agora mesmo';
}


function configurarFiltrosHistorico() {
    var filtroOperacao = document.getElementById('filtro-operacao');
    var filtroUsuario = document.getElementById('filtro-usuario');
    var filtroProduto = document.getElementById('filtro-produto');
    
    function aplicarFiltros() {
        var linhas = document.querySelectorAll('#tabela-historico tbody tr');
        
        linhas.forEach(linha => {
            var operacaoLinha = linha.getAttribute('data-operacao');
            var usuarioLinha = linha.getAttribute('data-usuario');
            var produtoLinha = linha.getAttribute('data-produto');
            
            var mostrarOperacao = !filtroOperacao.value || operacaoLinha === filtroOperacao.value;
            var mostrarUsuario = !filtroUsuario.value || usuarioLinha === filtroUsuario.value;
            var mostrarProduto = !filtroProduto.value || produtoLinha.includes(filtroProduto.value.toLowerCase());
            
            linha.style.display = (mostrarOperacao && mostrarUsuario && mostrarProduto) ? '' : 'none';
        });
    }
    
    if (filtroOperacao) filtroOperacao.addEventListener('change', aplicarFiltros);
    if (filtroUsuario) filtroUsuario.addEventListener('change', aplicarFiltros);
    if (filtroProduto) filtroProduto.addEventListener('input', aplicarFiltros);
}

function exportarHistoricoExcel() {
    if (typeof XLSX === 'undefined') {
        mostrarAlerta('Biblioteca Excel não carregada', 'error');
        return;
    }
    
    try {
        var dados = historico.map(h => {
            var data = new Date(h.data);
            var operacaoInfo = getOperacaoInfo(h.operacao, h.quantidade);
            
            var detalhesCompletos = getDetalhesOperacao(h).replace(/<br>/g, ' - ').replace(/<em>|<\/em>|<strong>|<\/strong>/g, '');
            
            return {
                'Data': data.toLocaleDateString('pt-BR'),
                'Hora': data.toLocaleTimeString('pt-BR'),
                'Usuário': h.usuario,
                'Operação': operacaoInfo.texto,
                'Produto/Item': h.produtoNome,
                'Código Produto': h.produtoId > 0 ? h.produtoId : '-',
                'Quantidade': h.quantidade,
                'Motivo': h.motivo || '-',
                'Aprovado Por': h.aprovadoPor || '-',
                'Descrição': operacaoInfo.descricao,
                'Detalhes Completos': detalhesCompletos
            };
        });
        
        var ws = XLSX.utils.json_to_sheet(dados);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Historico_Detalhado');
        
        var hoje = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, 'Historico_Detalhado_' + hoje + '.xlsx');
        
        mostrarAlerta('Histórico detalhado exportado com sucesso!', 'success');
        
        // Registrar a exportação no histórico
        historico.push({
            data: new Date().toISOString(),
            produtoId: 0,
            produtoNome: 'Exportação de Histórico Detalhado',
            operacao: 'exportar',
            quantidade: historico.length,
            usuario: usuarioLogado.nome
        });
        salvarDados();
        
    } catch (error) {
        mostrarAlerta('Erro ao exportar histórico: ' + error.message, 'error');
    }
}

// === DEBUG ===
window.debug = () => {
    console.log('=== DEBUG SISTEMA ===');
    console.log('Usuário logado:', usuarioLogado);
    console.log('Total usuários:', usuarios.length);
    console.log('Total produtos:', produtos.length);
    console.log('Total histórico:', historico.length);
    console.log('Solicitações pendentes:', solicitacoesRetirada.filter(s => s.status === 'pendente').length);
    console.log('Produto selecionado:', produtoSelecionado);
    console.log('Tela ativa:', document.querySelector('.screen.active')?.id);
    console.log('Chart.js:', typeof Chart !== 'undefined');
    console.log('XLSX:', typeof XLSX !== 'undefined');
    console.log('==================');
};

console.log('=== SISTEMA NEGRÃO - MELHORADO ===');