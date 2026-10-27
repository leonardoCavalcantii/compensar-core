# compensar-core

Backend do ComPensar: API REST em Express, Mongoose e TypeScript, com autenticação JWT e geração de PDF.
O frontend fica em outro repositório, o [compensar-gui](https://github.com/ufcg-lsd/compensar-gui).

Este repositório também traz o `docker-compose.yml`, que sobe o sistema completo
(MongoDB, carga inicial, backend e frontend) com um único comando.

## Requisitos

- [Git](https://git-scm.com/).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (no Windows, com WSL 2), para subir tudo com Docker.
- Para rodar sem Docker: [Node.js 24 (LTS)](https://nodejs.org/) com npm e um MongoDB 7.

Clone os dois repositórios lado a lado. O compose procura o frontend em `../compensar-gui`:

```text
qualquer-pasta/
├── compensar-core/   (este repositório)
└── compensar-gui/    (frontend)
```

```bash
git clone https://github.com/ufcg-lsd/compensar-core.git
git clone https://github.com/ufcg-lsd/compensar-gui.git
```

## Subir o sistema completo com Docker

1. Crie o `.env` a partir do exemplo e preencha a `PRIVATE_KEY`:

   ```bash
   cd compensar-core
   cp .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # cole o resultado em PRIVATE_KEY
   ```

   Se o frontend não estiver em `../compensar-gui`, defina `FRONTEND_PATH` no `.env`, com o caminho
   relativo a esta pasta. Por exemplo, com o backend em `back/compensar-core` e o frontend em
   `front/compensar-gui`, use `FRONTEND_PATH=../../front/compensar-gui`.

2. Suba tudo:

   ```bash
   docker compose up
   ```

3. Acesse <http://localhost:3000>.

| Serviço    | O que faz                                                        | Endereço na sua máquina |
|------------|------------------------------------------------------------------|-------------------------|
| `mongo`    | MongoDB 7, com os dados no volume `compensar-mongo-data`         | `localhost:27017`       |
| `seed`     | Roda `npm run seed` (competências e questões de exemplo) e termina | -                     |
| `backend`  | API (`npm run dev`), sobe depois que o seed termina              | <http://localhost:8080> |
| `frontend` | Next.js (`npm run dev`), com hot reload                          | <http://localhost:3000> |

Dentro do compose, o backend usa `MONGO_URI=mongodb://mongo:27017/compensar`, definido no próprio
`docker-compose.yml`. O `MONGO_URI` do seu `.env` (que aponta para `localhost`) só vale quando você roda sem Docker.

**Primeiro acesso:** o seed não cria usuários. Crie sua conta na tela **Criar conta**
(<http://localhost:3000/create-account>) ou pela API:

```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Seu Nome","username":"seu-usuario","email":"voce@exemplo.com","password":"#Senha123"}'
```

Depois, entre em <http://localhost:3000/login>. A busca de questões exige login.

Comandos úteis:

```bash
docker compose up -d               # sobe em segundo plano
docker compose logs -f backend     # acompanha os logs de um serviço
docker compose restart backend     # aplica mudanças em src/ (o backend não recarrega sozinho)
docker compose run --rm seed       # roda o seed de novo
docker compose up --build          # reconstrói as imagens (depois de mudar package.json)
docker compose down                # para tudo e mantém os dados
```

> Cuidado: `docker compose down -v` apaga o volume `compensar-mongo-data`, com todos os dados locais.

## Rodar sem Docker

```bash
npm ci
cp .env.example .env        # preencha PRIVATE_KEY; ajuste MONGO_URI se o seu MongoDB não estiver em localhost:27017
docker compose up -d mongo  # opcional: usa só o MongoDB do compose
npm run seed                # competências e questões de exemplo
npm run dev                 # http://localhost:8080
```

Teste rápido: <http://localhost:8080/api/competences> deve listar as 9 competências.

## Carga do banco (seed)

`npm run seed` preenche o banco apontado por `MONGO_URI` com:

- as 9 competências atuais (`src/seed/data/competences.json`);
- as questões de exemplo (`src/seed/data/questions.json`), cada uma com a lista `competences`
  (títulos das competências ligadas a ela).

O script é idempotente e pode rodar quantas vezes quiser. Competências e questões são
identificadas pelo título: as que já existem são atualizadas, e nada é duplicado. Os vínculos
questão-competência só são criados se ainda não existirem. O seed não apaga nada.

### Carregar questões exportadas da produção

Quando houver um export da coleção de questões, ele substitui as questões de exemplo:

```bash
mongoexport --uri "<endereço do banco>" --collection questions --out ../questions.json
npm run seed -- --questions ../questions.json     # ou SEED_QUESTIONS_FILE=../questions.json
```

Com Docker, monte o arquivo no container do seed:

```bash
docker compose run --rm -v "$(pwd)/../questions.json:/tmp/questions.json" seed npm run seed -- --questions /tmp/questions.json
```

- O arquivo pode ser um array JSON (`mongoexport --jsonArray`) ou JSON Lines (padrão do `mongoexport`).
  `_id` e `__v` são ignorados, e tipos do Extended JSON (`$oid`, `$numberInt`...) são convertidos.
- Campos obrigatórios em cada questão: `title`, `statement`, `type`, `font` e `response`.
- Os vínculos com competências vêm do campo opcional `competences` (lista de títulos). Os vínculos
  da coleção `competencequestions` da produção não são importados.
- Guarde o export **fora** do repositório e não o commite: ele contém dados da produção.

## Testes

```bash
npm test                  # unitários + integração, com cobertura
npm run test:unit         # só os unitários (modelos mockados)
npm run test:integration  # só os de integração (API + MongoDB temporário)
npm run lint
npm run build
```

Os testes de integração sobem um MongoDB temporário em memória (`mongodb-memory-server`). Na
primeira execução ele baixa o binário do MongoDB, o que pode demorar. Os testes nunca leem o `.env`
nem se conectam a outro banco.

## Variáveis de ambiente

Todas estão no [.env.example](.env.example). Nenhum endereço, porta ou chave fica fixo no código:
se uma variável obrigatória faltar, o servidor e o seed param na hora com uma mensagem que diz qual falta.

| Variável              | Usada por        | Obrigatória | Padrão            | Descrição |
|-----------------------|------------------|-------------|-------------------|-----------|
| `MONGO_URI`           | backend, seed    | sim         | -                 | Endereço do MongoDB. |
| `PRIVATE_KEY`         | backend, compose | sim         | -                 | Chave que assina e verifica os tokens JWT. |
| `PORT`                | backend          | não         | `8080`            | Porta HTTP do backend. |
| `SEED_QUESTIONS_FILE` | seed             | não         | -                 | Arquivo de questões no lugar dos exemplos. |
| `FRONTEND_PATH`       | compose          | não         | `../compensar-gui`| Caminho do repositório do frontend. |
| `MONGO_PORT`          | compose          | não         | `27017`           | Porta do MongoDB na sua máquina. |
| `BACKEND_PORT`        | compose          | não         | `8080`            | Porta do backend na sua máquina. |
| `FRONTEND_PORT`       | compose          | não         | `3000`            | Porta do frontend na sua máquina. |

## Problemas comuns no Windows

**O Docker Desktop não inicia ou mostra "Virtualization support not detected" / "WSL 2 installation is incomplete".**
O Docker Desktop precisa da virtualização e do WSL 2:

1. Ative a virtualização no BIOS/UEFI (Intel VT-x ou AMD-V/SVM). No Gerenciador de Tarefas,
   aba Desempenho > CPU, "Virtualização" deve aparecer como "Habilitado".
2. No PowerShell como administrador, rode `wsl --install` (ou `wsl --update`, se já estiver instalado)
   e reinicie o computador.
3. No Docker Desktop, em Settings > General, deixe marcado "Use the WSL 2 based engine".

**`ports are not available` / `bind: Only one usage of each socket address` na porta 27017.**
Outro MongoDB já usa a porta, normalmente o container avulso antigo `compensar-mongo`:

```bash
docker ps                      # veja quem está na porta 27017
docker stop compensar-mongo    # os dados ficam no volume compensar-mongo-data, que o compose reaproveita
```

Ou, sem parar o outro banco, troque a porta no `.env`: `MONGO_PORT=27018`.
O mesmo vale para 8080 e 3000 se o `npm run dev` do backend ou do frontend estiver rodando fora do
Docker: pare-o ou use `BACKEND_PORT` e `FRONTEND_PORT`.

**Aviso `volume "compensar-mongo-data" already exists but was not created by Docker Compose`.**
Aparece para quem usava o container avulso. É esperado: o compose reaproveita o volume e os dados.

**O frontend demora a refletir mudanças.**
Arquivos montados a partir do Windows não geram eventos de mudança no container, então o compose
liga o polling (`WATCHPACK_POLLING`). Funciona, mas é mais lento que rodar o `npm run dev` direto na máquina.
