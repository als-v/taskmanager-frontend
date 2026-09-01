# Task Manager Frontend

Frontend do servico de tarefas

## Como rodar

Requisitos: **Node 20.19+/22.12+**.

```bash
npm install

# rodar aplicacao local
npm start

# build
npm run build

# testes
npm test
npm run test:coverage
npm run e2e
```

## Organização

Angular 21, standalone com a seguinte organização:

```
core/           # camada dominio
shell/          # layou autenticado
board/          # quadro kanbam
dashboard/      # pagina inicial
projetos/       # pagina projetos
project-logs/   # auditoria por projeto
login/          # pagina login
registro/       # pagina registro
shared/         # componentes
```

Para o gerenciamento de estados foi usado o Signals, pela facilidade, simplicidade e para nao adicionar nenhuma dependencia a mais. Também para o drag-and-drop foi utilizado o @angular/cdk, por ter bastantes contribuições e comunidade ativa.

## Melhorias

**Deploy configuracao em runtime** Hoje a configuracao está apenas em build. O ideal sera ter esses valores passados dinamicamente e nao fixos.

**Testes** Foi iniciado uma base para o desenvolvimento dos testes, mas que ainda necessitam de mais cobertura.

**Responsividade** A aplicação não está totalmente responsiva. O ideal seria reformular todas as paginas para tal.
