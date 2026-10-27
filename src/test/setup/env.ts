// Chave usada só pelos testes unitários. As rotas exigem PRIVATE_KEY definida
// (não assinam nem verificam token com chave vazia), e o .env não é carregado aqui.
process.env.PRIVATE_KEY = 'unit-test-private-key';
