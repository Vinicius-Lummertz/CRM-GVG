module.exports = async (req, res) => {
    return res.status(501).json({
        success: false,
        error: 'Envio de template ainda nao foi migrado para o novo schema.'
    });
};
