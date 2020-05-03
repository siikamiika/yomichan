/*
 * Copyright (C) 2019-2020  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


function conditionsValidateOptionValue(object, value, isInput=false) {
    if (hasOwn(object, 'validate') && !object.validate(value)) {
        throw new Error('Invalid value for condition');
    }

    if (isInput && hasOwn(object, 'transformInput')) {
        value = object.transformInput(value);
    } else if (hasOwn(object, 'transform')) {
        value = object.transform(value);
    } else {
        return value;
    }

    if (hasOwn(object, 'validateTransformed') && !object.validateTransformed(value)) {
        throw new Error('Invalid value for condition');
    }

    return value;
}

function conditionsNormalizeOptionValue(descriptors, type, operator, optionValue, isInput) {
    if (!hasOwn(descriptors, type)) {
        throw new Error('Invalid type');
    }

    const conditionDescriptor = descriptors[type];
    if (!hasOwn(conditionDescriptor.operators, operator)) {
        throw new Error('Invalid operator');
    }

    const operatorDescriptor = conditionDescriptor.operators[operator];

    let transformedValue = conditionsValidateOptionValue(conditionDescriptor, optionValue, isInput);
    transformedValue = conditionsValidateOptionValue(operatorDescriptor, transformedValue, isInput);

    let transformReversedValue = transformedValue;
    if (hasOwn(operatorDescriptor, 'transformReverse')) {
        transformReversedValue = operatorDescriptor.transformReverse(transformedValue);
    }
    return [transformReversedValue, transformedValue];
}

function conditionsTestValueThrowing(descriptors, type, operator, optionValue, value) {
    if (!hasOwn(descriptors, type)) {
        throw new Error('Invalid type');
    }

    const conditionDescriptor = descriptors[type];
    if (!hasOwn(conditionDescriptor.operators, operator)) {
        throw new Error('Invalid operator');
    }

    const operatorDescriptor = conditionDescriptor.operators[operator];
    if (hasOwn(operatorDescriptor, 'transform')) {
        if (hasOwn(operatorDescriptor, 'transformCache')) {
            const key = `${optionValue}`;
            const transformCache = operatorDescriptor.transformCache;
            if (hasOwn(transformCache, key)) {
                optionValue = transformCache[key];
            } else {
                optionValue = operatorDescriptor.transform(optionValue);
                transformCache[key] = optionValue;
            }
        } else {
            optionValue = operatorDescriptor.transform(optionValue);
        }
    }

    return operatorDescriptor.test(value, optionValue);
}

function conditionsTestValue(descriptors, type, operator, optionValue, value) {
    try {
        return conditionsTestValueThrowing(descriptors, type, operator, optionValue, value);
    } catch (e) {
        return false;
    }
}

function conditionsClearCaches(descriptors) {
    for (const type in descriptors) {
        if (!hasOwn(descriptors, type)) {
            continue;
        }

        const conditionDescriptor = descriptors[type];
        if (hasOwn(conditionDescriptor, 'transformCache')) {
            conditionDescriptor.transformCache = {};
        }

        const operatorDescriptors = conditionDescriptor.operators;
        for (const operator in operatorDescriptors) {
            if (!hasOwn(operatorDescriptors, operator)) {
                continue;
            }

            const operatorDescriptor = operatorDescriptors[operator];
            if (hasOwn(operatorDescriptor, 'transformCache')) {
                operatorDescriptor.transformCache = {};
            }
        }
    }
}
