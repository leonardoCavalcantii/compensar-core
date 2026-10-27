// Chave usada só pelos testes. O app não carrega o .env, então nenhuma
// variável real (MONGO_URI, PRIVATE_KEY) chega aos testes de integração.
process.env.PRIVATE_KEY = 'integration-test-private-key';
