import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { Button, Card, Field, Row, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';

export default function SchoolResourceBankScreen() {
  const { resources, addResource, removeResource } = useApp();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');

  const add = () => {
    addResource(name.trim(), quantity.trim());
    setName('');
    setQuantity('');
  };

  return (
    <Screen tabScreen>
      <Title>School Resource Bank</Title>
      <Subtitle>
        Log materials available at your school. Students see these first when asking for material substitutes.
      </Subtitle>
      <Card>
        <Field label="Material" value={name} onChangeText={setName} placeholder="e.g. Maize cobs" />
        <Field label="Quantity (optional)" value={quantity} onChangeText={setQuantity} placeholder="e.g. 2 sacks" />
        <Button title="Add to resource bank" disabled={!name.trim()} onPress={add} />
      </Card>

      {resources.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', flex: 1 }}>
              {r.name}
              {r.quantity ? <Text style={{ color: colors.muted, fontWeight: '400' }}> · {r.quantity}</Text> : null}
            </Text>
            <Pressable onPress={() => removeResource(r.id)} hitSlop={8}>
              <Text style={{ color: colors.danger }}>Remove</Text>
            </Pressable>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
