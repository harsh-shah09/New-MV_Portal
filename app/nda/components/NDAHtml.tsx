import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#E4E4E4',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
});

// Create Document Component
const MyDocument = (elementId : string) => {
    const html = document.getElementById(elementId)
    return (
        (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        {html}
      </View>
    </Page>
  </Document>
)
    )
};

export default MyDocument;