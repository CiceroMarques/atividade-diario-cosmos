export async function buscarOPOD(data, sinal) {
  const parametros = new URLSearchParams({ date: data });
  const resposta = await fetch(`/api/opod?${parametros}`, { signal: sinal });

  let publicacao;
  try {
    publicacao = await resposta.json();
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }

  if (!resposta.ok) {
    throw new Error(publicacao.erro || "Não foi possível carregar a publicação.");
  }

  return publicacao;
}
