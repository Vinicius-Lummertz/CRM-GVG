const { isValidUuid, parseOptionalString, parseRequiredString, validateJsonObject } = require('../companies/utils');

function parseHexColor(value, fieldName = 'color') {
    if (value === undefined) return { value: undefined };
    if (value === null || value === '') return { value: null };

    const color = value.toString().trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return { error: `O campo '${fieldName}' deve ser uma cor hexadecimal valida.` };
    }

    return { value: color };
}

function parseBoolean(value, fieldName) {
    if (value === undefined) return { value: undefined };
    if (typeof value !== 'boolean') {
        return { error: `O campo '${fieldName}' deve ser booleano.` };
    }

    return { value };
}

function parseInteger(value, fieldName) {
    if (value === undefined) return { value: undefined };

    const numberValue = Number(value);
    if (!Number.isInteger(numberValue)) {
        return { error: `O campo '${fieldName}' deve ser um numero inteiro.` };
    }

    return { value: numberValue };
}

function validateNotebookPayload(body, options = {}) {
    const payload = {};
    const isUpdate = options.isUpdate === true;

    if (!isUpdate || body.title !== undefined) {
        const title = parseRequiredString(body.title, 'title');
        if (title.error) return { error: title.error };
        payload.title = title.value;
    }

    if (body.description !== undefined) {
        payload.description = parseOptionalString(body.description);
    }

    if (body.color !== undefined) {
        const color = parseHexColor(body.color);
        if (color.error) return { error: color.error };
        payload.color = color.value || '#2563eb';
    }

    if (body.icon !== undefined) {
        payload.icon = parseOptionalString(body.icon) || 'notebook';
    }

    if (body.sort_order !== undefined) {
        const sortOrder = parseInteger(body.sort_order, 'sort_order');
        if (sortOrder.error) return { error: sortOrder.error };
        payload.sort_order = sortOrder.value;
    }

    if (body.updated_by !== undefined) {
        if (body.updated_by && !isValidUuid(body.updated_by)) {
            return { error: "O campo 'updated_by' deve ser um UUID valido." };
        }
        payload.updated_by = body.updated_by || null;
    }

    return { payload };
}

function validateNotePayload(body, options = {}) {
    const payload = {};
    const isUpdate = options.isUpdate === true;

    if (!isUpdate || body.title !== undefined) {
        const title = parseRequiredString(body.title, 'title');
        if (title.error) return { error: title.error };
        payload.title = title.value;
    }

    if (!isUpdate || body.content_json !== undefined) {
        const contentJson = validateJsonObject(body.content_json || {}, 'content_json');
        if (contentJson.error) return { error: contentJson.error };
        payload.content_json = contentJson.value || {};
    }

    if (body.content_html !== undefined) {
        payload.content_html = body.content_html ? body.content_html.toString() : '';
    }

    if (body.content_text !== undefined) {
        payload.content_text = body.content_text ? body.content_text.toString() : '';
    }

    if (body.color !== undefined) {
        const color = parseHexColor(body.color);
        if (color.error) return { error: color.error };
        payload.color = color.value;
    }

    if (body.is_pinned !== undefined) {
        const isPinned = parseBoolean(body.is_pinned, 'is_pinned');
        if (isPinned.error) return { error: isPinned.error };
        payload.is_pinned = isPinned.value;
    }

    if (body.sort_order !== undefined) {
        const sortOrder = parseInteger(body.sort_order, 'sort_order');
        if (sortOrder.error) return { error: sortOrder.error };
        payload.sort_order = sortOrder.value;
    }

    if (body.notebook_id !== undefined) {
        if (!body.notebook_id || !isValidUuid(body.notebook_id)) {
            return { error: "O campo 'notebook_id' deve ser um UUID valido." };
        }
        payload.notebook_id = body.notebook_id;
    }

    if (body.updated_by !== undefined) {
        if (body.updated_by && !isValidUuid(body.updated_by)) {
            return { error: "O campo 'updated_by' deve ser um UUID valido." };
        }
        payload.updated_by = body.updated_by || null;
    }

    return { payload };
}

module.exports = {
    isValidUuid,
    parseBoolean,
    parseHexColor,
    parseInteger,
    parseOptionalString,
    parseRequiredString,
    validateNotePayload,
    validateNotebookPayload
};
