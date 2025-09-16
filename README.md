# Projeto Kogma

O Kogma é um sistema de gestão de pedidos, processos produtivos e controle de materiais desenvolvido em TypeScript, React e Node.js, com MySQL como banco de dados principal.  

Ele foi desenhado para indústrias, metalúrgicas e empresas de manufatura que precisam de um controle preciso de ordens de produção, estoque e prazos, oferecendo dashboard visual, status automático e validações inteligentes de dados.

## Visão Geral

O Kogma nasce da necessidade de centralizar a gestão produtiva em um único sistema, reduzindo erros, melhorando a comunicação entre áreas e oferecendo relatórios precisos.  

Exemplos de uso:
- Uma ordem de produção é cadastrada.  
- Cada processo recebe uma data planejada.  
- O sistema controla o avanço (`done`) ou atraso (`late`).  
- Os materiais são verificados em estoque; se não disponíveis, são marcados como `request`.  

## Arquitetura

A arquitetura é baseada em monorepo, com separação entre frontend, backend e módulos compartilhados:

ProjetoKogma/
├── packages/
│   ├── app/          # Frontend (React + TS + Tailwind)
│   ├── main/         # Backend (Node.js + Express + Prisma)
│   ├── prisma/       # Definição ORM e migrações
│   └── shared/       # Tipos e utilitários
├── Dump20250916.sql  # Dump inicial do banco (MySQL World DB)
└── README.md         # Documentação oficial

### Diagrama Simplificado

[Frontend React] ⇄ [API REST Node.js] ⇄ [Prisma ORM] ⇄ [MySQL]

## Tecnologias Utilizadas

### Core
- Frontend: React + TypeScript  
- Backend: Node.js + Express  
- ORM: Prisma  
- Banco de Dados: MySQL 8.0  

### Estilo & UI
- TailwindCSS  
- Componentização com pills (StatusFilter, SearchFilter, etc.)  

### Integração
- Axios (requisições HTTP)  
- API RESTful com autenticação JWT (opcional)  

### DevOps
- Docker (containers para app + DB)  
- ESLint + Prettier (padronização de código)  
- Husky + Lint-Staged (pré-commit hooks)  

## Frontend

- React + TypeScript  
- Estrutura em páginas e componentes reutilizáveis  
- Uso de hooks (`useEffect`, `useMemo`, `useState`) para otimização  
- Validação de datas e formulários no frontend  
- Filtros dinâmicos: Status, busca textual, seleção de processos  

## Backend

- Node.js com Express para rotas e middlewares  
- Prisma ORM: abstração SQL + migrations  
- Validação de entradas: middleware para sanitizar e validar dados  
- API REST organizada em módulos:  
  - `/orders` → pedidos  
  - `/materials` → materiais  
  - `/processes` → processos produtivos  
  - `/companies` → clientes/fornecedores  

## Banco de Dados

O dump fornecido (`Dump20250916.sql`) contém as tabelas clássicas do MySQL World Database (city, country, countrylanguage).  

Essas tabelas podem ser extendidas/customizadas para:  
- `orders` → pedidos de produção  
- `order_materials` → materiais associados ao pedido  
- `processes` → etapas do fluxo produtivo  
- `companies` → empresas (clientes/fornecedores)  

Exemplo simplificado de relação:

companies (1) ── (N) orders ── (N) processes
                          └─ (N) order_materials

## Estrutura do Projeto

packages/app/
  ├── src/components/   # Pills, filtros, timeline
  ├── src/pages/        # Telas principais
  ├── src/lib/api.ts    # Conexão com backend
  └── src/styles/       # Tailwind configs

packages/main/
  ├── src/routes/       # Rotas da API
  ├── src/controllers/  # Regras de negócio
  ├── src/models/       # Schemas do Prisma
  └── src/middleware/   # Autenticação e validação

## Instalação e Execução

### Pré-requisitos
- Node.js >= 18  
- MySQL >= 8  
- NPM ou Yarn  
- Docker (opcional)

### Passos

```bash
git clone https://github.com/seu-usuario/projeto-kogma.git
cd projeto-kogma

# Instalar dependências
npm install

# Configurar .env
DATABASE_URL="mysql://root:senha@localhost:3306/kogma"

# Rodar migrations
npx prisma migrate dev

# Iniciar backend
npm run dev:main

# Iniciar frontend
npm run dev:app
```

## Funcionalidades Principais

✅ Gestão de pedidos de produção  
✅ Controle de processos (datas planejadas, concluídas, atrasos)  
✅ Estoque inteligente (materiais em estoque ou requisitados)  
✅ Relatórios de status (`open`, `late`, `done`)  
✅ Filtros e busca avançada  
✅ Timeline visual da produção  


## Fluxo de Dados

1. Usuário cadastra pedido no frontend.  
2. API recebe e valida (backend).  
3. Prisma insere em MySQL.  
4. Frontend atualiza em tempo real via requisição.  
5. Status (`open`, `late`, `done`) é calculado automaticamente.  

## Testes

- Unitários com Jest  
- Integração com Supertest
- E2E (opcional) com Playwright  

```bash
npm run test
```

## CI/CD e Deploy

- CI: GitHub Actions (lint, build, testes)  
- CD:  
  - Backend → Docker + VPS (AWS/DigitalOcean)  
  - Frontend → Vercel/Netlify  
  - Banco → RDS (AWS) ou PlanetScale  

## Contribuindo

1. Faça um fork  
2. Crie uma branch (`git checkout -b feature/minha-feature`)  
3. Commit suas mudanças (`git commit -m 'Adicionei tal coisa'`)  
4. Push (`git push origin feature/minha-feature`)  
5. Abra um Pull Request 🚀  

## Roadmap Futuro

- [ ] Autenticação e controle de usuários (RBAC)  
- [ ] Dashboard com gráficos (Recharts/D3.js)  
- [ ] Notificações automáticas de atraso  
- [ ] Integração com ERP/CRM externos  
- [ ] Módulo mobile (React Native ou PWA)  

## Licença

Distribuído sob a licença MIT.  
Sinta-se livre para usar, estudar, modificar e distribuir.  
