import plotly.express as px
import plotly.graph_objects as go
import pandas as pd


def plot_heatmap(heatmap_data, rating_medio_per_genere, rating_medio_per_nazione, custom_palette):
    """
    Crea la visualizzazione della heatmap con Plotly.
    Riceve i dati già processati e si occupa solo del rendering grafico.
    """

    def get_color_for_rating(rating):
        """Mappa il rating a un colore dalla palette"""
        for interval, color in custom_palette.items():
            if interval.left < rating <= interval.right:
                return color
        return '#000000'

    # Crea la heatmap base
    fig = px.density_heatmap(
        heatmap_data,
        x='genre',
        y='country',
        z='num_film',
        histfunc='sum',
        title='Heatmap: Numero di film e rating medio per nazione e genere',
        labels={'genre': 'Genere', 'country': 'Nazione', 'num_film': 'Numero di film'},
        color_continuous_scale=px.colors.sequential.Plasma
    )

    # Aggiungi annotazioni con il rating medio e colore personalizzato
    for i, row in heatmap_data.iterrows():
        fig.add_annotation(
            x=row['genre'], y=row['country'],
            text=f"{row['rating_medio']:.2f}",  # Mostra il rating medio con 2 decimali
            showarrow=False,
            font=dict(size=10, color=get_color_for_rating(row['rating_medio']))  # Colore basato sul rating medio
        )

    # Aggiungi una seconda asse x con il rating medio per genere
    for i, row in rating_medio_per_genere.iterrows():
        fig.add_annotation(
            x=row['genre'], y=1.07,  # Posizione sopra la heatmap
            text=f"{row['rating_medio_genere']:.2f}",  # Mostra il rating medio per genere
            showarrow=False,
            font=dict(size=10, color=get_color_for_rating(row['rating_medio_genere'])),
            # Colore basato sul rating medio
            xref='x', yref='paper'  # Usa l'asse x della heatmap e un'asse y relativa al paper
        )

    # Aggiungi la scritta "Rating" sopra la riga delle medie per genere (prima riga)
    fig.add_annotation(
        x=-1.1, y=1.1,  # Posizione sopra la heatmap, a sinistra dei generi
        text="Rating",  # Testo "Rating"
        showarrow=False,
        font=dict(size=12, color='white'),  # Cambia il colore del testo in bianco
        xref='x', yref='paper'  # Usa l'asse x della heatmap e un'asse y relativa al paper
    )

    # Aggiungi la scritta "medio" sopra la riga delle medie per genere (seconda riga)
    fig.add_annotation(
        x=-1.1, y=1.05,  # Posizione leggermente più in basso rispetto alla prima annotazione
        text="medio",  # Testo "medio"
        showarrow=False,
        font=dict(size=12, color='white'),  # Cambia il colore del testo in bianco
        xref='x', yref='paper'  # Usa l'asse x della heatmap e un'asse y relativa al paper
    )

    # Aggiungi una colonna a destra con il rating medio per nazione
    for i, row in rating_medio_per_nazione.iterrows():
        fig.add_annotation(
            x=1.04, y=row['country'],  # Posizione a destra della heatmap
            text=f"{row['rating_medio_nazione']:.2f}",  # Mostra il rating medio per nazione
            showarrow=False,
            font=dict(size=10, color=get_color_for_rating(row['rating_medio_nazione'])),
            # Colore basato sul rating medio
            xref='paper', yref='y'  # Usa un'asse x relativa al paper e l'asse y della heatmap
        )

    # Aggiungi la scritta "Rating" nella colonna delle medie per nazione (prima riga)
    fig.add_annotation(
        x=1.05, y=-0.5,  # Posizione a destra della heatmap, sotto le nazioni
        text="Rating",  # Testo "Rating"
        showarrow=False,
        font=dict(size=12, color='white'),  # Cambia il colore del testo in bianco
        xref='paper', yref='y'  # Usa un'asse x relativa al paper e l'asse y della heatmap
    )

    # Aggiungi la scritta "medio" nella colonna delle medie per nazione (seconda riga)
    fig.add_annotation(
        x=1.05, y=-1,  # Posizione leggermente più in basso rispetto alla prima annotazione
        text="medio",  # Testo "medio"
        showarrow=False,
        font=dict(size=12, color='white'),  # Cambia il colore del testo in bianco
        xref='paper', yref='y'  # Usa un'asse x relativa al paper e l'asse y della heatmap
    )

    # Crea una legenda personalizzata per i colori delle medie
    legend_labels = {
        '(-0.001, 1.0]': '0-1',
        '(1.0, 2.0]': '1-2',
        '(2.0, 3.0]': '2-3',
        '(3.0, 4.0]': '3-4',
        '(4.0, 5.0]': '4-5'
    }

    # Inverti l'ordine del dizionario legend_labels
    legend_labels = dict(reversed(list(legend_labels.items())))

    # Aggiungi le tracce per la legenda
    for interval, label in legend_labels.items():
        fig.add_trace(go.Scatter(
            x=[None],  # Non mostrare punti nel grafico
            y=[None],  # Non mostrare punti nel grafico
            mode='markers',
            marker=dict(size=10, color=custom_palette[
                pd.Interval(float(interval.split(',')[0].strip('(')), float(interval.split(',')[1].strip(']')),
                            closed='right')]),
            name=f'Rating {label}'  # Etichetta della legenda
        ))

    # Personalizza il layout
    fig.update_layout(
        xaxis_title='Genere',
        yaxis_title='Nazione',
        coloraxis_colorbar_title='Numero di film',
        coloraxis_colorbar=dict(x=1.06),  # Sposta la barra dei colori del numero di film più a destra
        legend_title='Rating medio',  # Titolo della legenda
        legend=dict(x=1.15, y=0.8),  # Posizione della legenda (fuori dal grafico)
        margin=dict(l=110, r=150)  # Aumenta il margine per la colonna a destra
    )

    return fig