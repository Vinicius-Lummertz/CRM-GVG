const { extractConnection, fetchCompany } = require('./utils');

module.exports = async (req, res) => {
    const { companyId } = req.params;
    const fetched = await fetchCompany(companyId);

    if (fetched.error) {
        return res.status(fetched.status || 400).json({ success: false, error: fetched.error });
    }

    return res.status(200).json({
        success: true,
        company_id: companyId,
        chat_connection: extractConnection(fetched.company)
    });
};
