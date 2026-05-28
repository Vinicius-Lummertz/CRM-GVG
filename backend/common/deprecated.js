module.exports = function deprecatedEndpoint(resourceName) {
    return (req, res) => {
        return res.status(410).json({
            success: false,
            error: "ENDPOINT_DEPRECATED",
            message: `O recurso '${resourceName}' foi removido do schema atual e este endpoint foi descontinuado.`
        });
    };
};
