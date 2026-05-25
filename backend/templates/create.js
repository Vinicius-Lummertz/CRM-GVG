module.exports = async (req, res) => {
    return res.status(501).json({
        success: false,
        error: 'Cadastro de templates nao esta habilitado nesta versao do banco.'
    });
};
